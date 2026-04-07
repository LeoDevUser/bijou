package com.bijou.backend.services;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

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

    public String createPaymentIntent(Client client, Order order, Currency currency) {
        try {
            String customerId = resolveCustomer(client);
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
               .setAmount(order.getTotalPrice().multiply(BigDecimal.valueOf(100)).longValue())
               .setCurrency(currency.toString())
               .setCustomer(customerId)
               .putMetadata("orderId", order.getId().toString())
               .setAutomaticPaymentMethods(
                       PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                       .setEnabled(true)
                       .setAllowRedirects(PaymentIntentCreateParams.AutomaticPaymentMethods.AllowRedirects.NEVER)
                       .build()
                       )
               .build();

           PaymentIntent intent = PaymentIntent.create(params);
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
        if (client.getStripeCustomerId() != null) {
            return client.getStripeCustomerId();
        }

        CustomerCreateParams params = CustomerCreateParams.builder()
            .setEmail(client.getEmail())
            .setName(client.getFirstName() + " " + client.getLastName())
            .putMetadata("clientId", client.getId().toString())
            .build();

        Customer customer = Customer.create(params);
        client.setStripeCustomerId(customer.getId());
        clientRepository.save(client); 
        log.info("created stripe customer {} for client {}", customer.getId(), client.getId());

        return customer.getId();
    }

    public void handleWebhook(String payload, String sigHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webSecret);
        } catch (SignatureVerificationException e) {
            log.warn("invalid stripe webhook signature");
            throw new AppException(HttpStatus.BAD_REQUEST, "WEBHOOK_SIGNATURE_INVALID");
        }

        StripeObject stripeObject = event.getDataObjectDeserializer()
            .getObject()
            .orElseThrow(() -> {
                log.error("could not deserialize stripe event");
                return new AppException(HttpStatus.BAD_REQUEST, "WEBHOOK_DESERIALIZE_FAILED");
            });


        if (!(stripeObject instanceof PaymentIntent intent)) {
            return;
        }

        switch (event.getType()) {
            case "payment_intent.succeeded" -> handleSuccess(intent);
            case "payment_intent.payment_failed" -> handleFailure(intent);
            case "payment_intent.created" -> log.info("payment intent created");
            default -> log.info("unhandled stripe event type: {}", event.getType());
        }

    }
    

    public String getClientSecret(Client client, Long orderId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() ->
            new AppException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        if (!order.getClient().getId().equals(client.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "ORDER_ACCESS_DENIED");
        }
        if (order.getStatus() != Status.AWAITING_PAYMENT) {
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "ORDER_NOT_AWAITING_PAYMENT");
        }
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
        eventPublisher.publishEvent(new PaymentSuccessEvent(order.getClient(), order.getId()));
        Client client = clientRepository.findById(order.getClient().getId())
            .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "CLIENT NOT FOUND"));
        client.setNbSuccessfulOrders(client.getNbSuccessfulOrders() + 1);
        client.setMoneySpent(client.getMoneySpent().add(order.getTotalPrice()));
        clientRepository.save(client);
        log.info("updated stats for client {} after successful payment", client.getEmail());
    }

    private void handleFailure(PaymentIntent intent) {
        Order order = findOrderOrLog(intent.getId());
        if (order == null) return;
        if (order.getStatus() != Status.AWAITING_PAYMENT) return;
        String failureReason = intent.getLastPaymentError() != null ? intent.getLastPaymentError().getMessage() : "unknown";
        log.warn("payment failed for order #{} — reason: {} — intent: {}", order.getId(), failureReason, intent.getId());
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
