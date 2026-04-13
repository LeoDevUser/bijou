package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bijou.backend.entities.Client;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.entities.Order;
import com.bijou.backend.entities.Status;
import com.bijou.backend.repositories.ClientRepository;
import com.bijou.backend.repositories.OrderRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.PaymentIntentCreateParams;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final OrderRepository orderRepository;
    private final ClientRepository clientRepository;
    private final ApplicationEventPublisher eventPublisher;
    @Value("${stripe.webhook.secret}")
    private String webSecret;

    /**
     * JVM-level lock that serialises Stripe customer creation per-process.
     * Prevents two concurrent first-orders from the same client both reaching
     * Customer.create() before either has saved the resulting stripeCustomerId.
     */
    private final java.util.concurrent.locks.ReentrantLock customerCreationLock =
            new java.util.concurrent.locks.ReentrantLock();

    public String createPaymentIntent(Client client, Order order, Currency currency) {
        try {
            String customerId = resolveCustomer(client);
            long amountCents = order.getTotalPrice().multiply(BigDecimal.valueOf(100)).longValue();
            boolean isMsi = order.getInstallments() != null;

            PaymentIntentCreateParams.Builder paramsBuilder = PaymentIntentCreateParams.builder()
                .setAmount(amountCents)
                .setCurrency("mxn")
                .setCustomer(customerId)
                .putMetadata("orderId", order.getId().toString());

            if (isMsi) {
                paramsBuilder
                    .addPaymentMethodType("card")
                    .setPaymentMethodOptions(
                        PaymentIntentCreateParams.PaymentMethodOptions.builder()
                            .setCard(
                                PaymentIntentCreateParams.PaymentMethodOptions.Card.builder()
                                    .setInstallments(
                                        PaymentIntentCreateParams.PaymentMethodOptions.Card.Installments.builder()
                                            .setEnabled(true)
                                            .build()
                                    )
                                    .build()
                            )
                            .build()
                    );
            } else {
                // All charges are MXN — always offer card and bank transfer
                paramsBuilder
                    .addPaymentMethodType("card")
                    .addPaymentMethodType("customer_balance")
                    .setPaymentMethodOptions(
                        PaymentIntentCreateParams.PaymentMethodOptions.builder()
                            .setCustomerBalance(
                                PaymentIntentCreateParams.PaymentMethodOptions.CustomerBalance.builder()
                                    .setFundingType(PaymentIntentCreateParams.PaymentMethodOptions.CustomerBalance.FundingType.BANK_TRANSFER)
                                    .setBankTransfer(
                                        PaymentIntentCreateParams.PaymentMethodOptions.CustomerBalance.BankTransfer.builder()
                                            .setType(PaymentIntentCreateParams.PaymentMethodOptions.CustomerBalance.BankTransfer.Type.MX_BANK_TRANSFER)
                                            .build()
                                    )
                                    .build()
                            )
                            .build()
                    );

                // OXXO has a hard 10,000 MXN limit enforced by Stripe at intent creation
                if (amountCents <= 1_000_000L) {
                    paramsBuilder.addPaymentMethodType("oxxo");
                }
            }

            PaymentIntent intent = PaymentIntent.create(paramsBuilder.build());
            order.setStripePaymentIntentId(intent.getId());
            orderRepository.save(order);

            log.info("created payment intent {} for order {}", intent.getId(), order.getId());
            return intent.getClientSecret();

        } catch (StripeException e) {
            log.error("stripe error creating payment intent for order {}: {}", order.getId(), e.getMessage());
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "PAYMENT_INIT_FAILED");
        }
    }

    private String resolveCustomer(Client client) throws StripeException {
        // Fast path — already has a customer ID.
        if (client.getStripeCustomerId() != null) return client.getStripeCustomerId();

        // Slow path: acquire a JVM lock to prevent two concurrent first-orders from
        // creating duplicate Stripe customers for the same client.
        customerCreationLock.lock();
        try {
            // Re-read from DB now that we hold the lock — another thread may have
            // just created and saved the customer while we were waiting.
            Client fresh = clientRepository.findById(client.getId()).orElseThrow();
            if (fresh.getStripeCustomerId() != null) return fresh.getStripeCustomerId();

            CustomerCreateParams params = CustomerCreateParams.builder()
                .setEmail(fresh.getEmail())
                .setName(fresh.getFirstName() + " " + fresh.getLastName())
                .putMetadata("clientId", fresh.getId().toString())
                .build();

            Customer customer = Customer.create(params);
            fresh.setStripeCustomerId(customer.getId());
            clientRepository.save(fresh);
            log.info("created stripe customer {} for client {}", customer.getId(), fresh.getId());
            return customer.getId();
        } finally {
            customerCreationLock.unlock();
        }
    }

    @Transactional
    public void handleWebhook(String payload, String sigHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webSecret);
        } catch (SignatureVerificationException e) {
            log.warn("invalid stripe webhook signature");
            throw new AppException(HttpStatus.BAD_REQUEST, "WEBHOOK_SIGNATURE_INVALID");
        }

        StripeObject stripeObject;
        try {
            stripeObject = event.getDataObjectDeserializer().deserializeUnsafe();
        } catch (Exception e) {
            log.error("could not deserialize stripe event: {}", e.getMessage());
            throw new AppException(HttpStatus.BAD_REQUEST, "WEBHOOK_DESERIALIZE_FAILED");
        }

        if (!(stripeObject instanceof PaymentIntent intent)) return;

        switch (event.getType()) {
            case "payment_intent.succeeded"       -> handleSuccess(intent);
            case "payment_intent.requires_action" -> handleRequiresAction(intent);
            case "payment_intent.processing"      -> handleProcessing(intent);
            case "payment_intent.payment_failed"  -> handleFailure(intent);
            case "payment_intent.created"         -> log.info("payment intent created");
            default -> log.info("unhandled stripe event type: {}", event.getType());
        }
    }

    public String getClientSecret(Client client, Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() ->
            new AppException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        if (!order.getClient().getId().equals(client.getId()))
            throw new AppException(HttpStatus.FORBIDDEN, "ORDER_ACCESS_DENIED");
        if (order.getStatus() != Status.AWAITING_PAYMENT)
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "ORDER_NOT_AWAITING_PAYMENT");
        try {
            return PaymentIntent.retrieve(order.getStripePaymentIntentId()).getClientSecret();
        } catch (StripeException e) {
            log.error("failed to retrieve payment intent for order {}: {}", orderId, e.getMessage());
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "PAYMENT_RETRIEVE_FAILED");
        }
    }

    public void cancelIntent(String intentId) {
        try {
            PaymentIntent.retrieve(intentId).cancel();
        } catch (StripeException e) {
            log.warn("failed to cancel intent {}, check manually", intentId);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "PAYMENT_CANCEL_FAILED");
        }
    }

    private void handleSuccess(PaymentIntent intent) {
        Order order = findOrderOrLog(intent.getId());
        if (order == null) return;
        if (order.getStatus() != Status.AWAITING_PAYMENT) return;

        log.info("payment succeeded for order #{} — amount: {} {} — intent: {}",
            order.getId(), intent.getAmount() / 100.0, intent.getCurrency().toUpperCase(), intent.getId());

        Client client = clientRepository.findById(order.getClient().getId())
            .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "CLIENT_NOT_FOUND"));

        // For card payments, send order received first (OXXO/bank transfer already got it earlier)
        if (!order.isOxxo() && !order.isBankTransfer()) {
            eventPublisher.publishEvent(buildReceivedEvent(client, order));
        }

        // Payment confirmed email for all payment types
        eventPublisher.publishEvent(buildConfirmationEvent(client, order, null));

        // Atomic SQL increment — avoids lost-update if two orders for the same client
        // succeed concurrently (e.g., simultaneous OXXO + bank-transfer webhooks).
        clientRepository.incrementStats(client.getId(), order.getTotalPrice());
        eventPublisher.publishEvent(new PaymentSuccessEvent(client, order.getId()));
        log.info("updated stats for client {} after successful payment", client.getEmail());
    }

    private void handleRequiresAction(PaymentIntent intent) {
        if (intent.getNextAction() == null) return;

        Order order = findOrderOrLog(intent.getId());
        if (order == null) return;
        if (order.getStatus() != Status.AWAITING_PAYMENT) return;

        Client client = clientRepository.findById(order.getClient().getId())
            .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "CLIENT_NOT_FOUND"));

        if (intent.getNextAction().getOxxoDisplayDetails() != null) {
            String voucherUrl = intent.getNextAction().getOxxoDisplayDetails().getHostedVoucherUrl();
            order.setOxxo(true);
            orderRepository.save(order);
            log.info("OXXO voucher generated for order #{} — client {}", order.getId(), client.getEmail());
            eventPublisher.publishEvent(buildConfirmationEvent(client, order, voucherUrl));
        } else if (intent.getNextAction().getDisplayBankTransferInstructions() != null) {
            order.setBankTransfer(true);
            orderRepository.save(order);
            log.info("bank transfer instructions issued for order #{} — client {}", order.getId(), client.getEmail());
            eventPublisher.publishEvent(buildBankTransferEvent(client, order, intent));
        }
    }

    private void handleProcessing(PaymentIntent intent) {
        Order order = findOrderOrLog(intent.getId());
        if (order == null) return;
        log.info("bank transfer processing for order #{} — funds received by Stripe, awaiting settlement", order.getId());
    }

    private OrderReceivedEvent buildReceivedEvent(Client client, Order order) {
        List<OrderReceivedEvent.ItemLine> lines = order.getOrderItems().stream()
            .map(oi -> {
                String en = oi.getItem().getNameEn();
                String fr = oi.getItem().getNameFr();
                String es = oi.getItem().getNameEs();
                String name = switch (client.getLanguage()) {
                    case FR -> fr != null ? fr : (en != null ? en : es);
                    case ES -> es != null ? es : (en != null ? en : fr);
                    default -> en != null ? en : (fr != null ? fr : es);
                };
                return new OrderReceivedEvent.ItemLine(name, oi.getQuantity(), oi.getUnitPrice());
            }).toList();

        return new OrderReceivedEvent(
            client.getEmail(),
            client.getFirstName(),
            client.getLanguage(),
            order.getId(),
            lines,
            order.getTotalPrice(),
            order.getDutyAmount()   != null ? order.getDutyAmount()   : BigDecimal.ZERO,
            order.getTaxAmount()    != null ? order.getTaxAmount()    : BigDecimal.ZERO,
            order.getHandlingFee()  != null ? order.getHandlingFee()  : BigDecimal.ZERO,
            order.getAddressLine1(),
            order.getCity(),
            order.getPostalCode(),
            order.getCountry(),
            order.getInstallments(),
            order.isBankTransfer()
        );
    }

    private OrderConfirmationEvent buildConfirmationEvent(Client client, Order order, String oxxoVoucherUrl) {
        List<OrderConfirmationEvent.ItemLine> lines = order.getOrderItems().stream()
            .map(oi -> {
                String en = oi.getItem().getNameEn();
                String fr = oi.getItem().getNameFr();
                String es = oi.getItem().getNameEs();
                String name = switch (client.getLanguage()) {
                    case FR -> fr != null ? fr : (en != null ? en : es);
                    case ES -> es != null ? es : (en != null ? en : fr);
                    default -> en != null ? en : (fr != null ? fr : es);
                };
                return new OrderConfirmationEvent.ItemLine(name, oi.getQuantity(), oi.getUnitPrice());
            }).toList();

        return new OrderConfirmationEvent(
            client.getEmail(),
            client.getFirstName(),
            client.getLanguage(),
            order.getId(),
            lines,
            order.getTotalPrice(),
            order.getDutyAmount()   != null ? order.getDutyAmount()   : BigDecimal.ZERO,
            order.getTaxAmount()    != null ? order.getTaxAmount()    : BigDecimal.ZERO,
            order.getHandlingFee()  != null ? order.getHandlingFee()  : BigDecimal.ZERO,
            order.getAddressLine1(),
            order.getCity(),
            order.getPostalCode(),
            order.getCountry(),
            oxxoVoucherUrl,
            order.getInstallments(),
            order.isOxxo(),
            order.isBankTransfer()
        );
    }

    private BankTransferInstructionsEvent buildBankTransferEvent(Client client, Order order, PaymentIntent intent) {
        var instructions = intent.getNextAction().getDisplayBankTransferInstructions();

        String clabe = null;
        String bankName = null;
        if (instructions.getFinancialAddresses() != null) {
            for (var addr : instructions.getFinancialAddresses()) {
                if ("spei".equals(addr.getType()) && addr.getSpei() != null) {
                    clabe    = addr.getSpei().getClabe();
                    bankName = addr.getSpei().getBankName();
                    break;
                }
            }
        }

        List<BankTransferInstructionsEvent.ItemLine> lines = order.getOrderItems().stream()
            .map(oi -> {
                String en = oi.getItem().getNameEn();
                String fr = oi.getItem().getNameFr();
                String es = oi.getItem().getNameEs();
                String name = switch (client.getLanguage()) {
                    case FR -> fr != null ? fr : (en != null ? en : es);
                    case ES -> es != null ? es : (en != null ? en : fr);
                    default -> en != null ? en : (fr != null ? fr : es);
                };
                return new BankTransferInstructionsEvent.ItemLine(name, oi.getQuantity(), oi.getUnitPrice());
            }).toList();

        return new BankTransferInstructionsEvent(
            client.getEmail(),
            client.getFirstName(),
            client.getLanguage(),
            order.getId(),
            lines,
            order.getTotalPrice(),
            order.getDutyAmount()  != null ? order.getDutyAmount()  : BigDecimal.ZERO,
            order.getTaxAmount()   != null ? order.getTaxAmount()   : BigDecimal.ZERO,
            order.getHandlingFee() != null ? order.getHandlingFee() : BigDecimal.ZERO,
            order.getAddressLine1(),
            order.getCity(),
            order.getPostalCode(),
            order.getCountry(),
            clabe,
            bankName,
            instructions.getReference(),
            instructions.getHostedInstructionsUrl()
        );
    }

    private void handleFailure(PaymentIntent intent) {
        Order order = findOrderOrLog(intent.getId());
        if (order == null) return;
        if (order.getStatus() != Status.AWAITING_PAYMENT) return;
        String reason = intent.getLastPaymentError() != null ? intent.getLastPaymentError().getMessage() : "unknown";
        log.warn("payment failed for order #{} — reason: {} — intent: {}", order.getId(), reason, intent.getId());
        eventPublisher.publishEvent(new PaymentFailedEvent(order.getClient(), order.getId()));
        try {
            intent.cancel();
        } catch (StripeException e) {
            log.warn("failed to cancel intent {}, check manually", intent.getId());
        }
    }

    private Order findOrderOrLog(String paymentIntentId) {
        return orderRepository.findByStripePaymentIntentId(paymentIntentId)
            .orElseGet(() -> {
                log.warn("no order found for payment intent {}", paymentIntentId);
                return null;
            });
    }
}
