package com.bijou.backend.services;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.bijou.backend.entities.Client;
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
    @Value("${STRIPE_WEBHOOK_SECRET}")
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
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "payment initialization failed");
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid signature");
        }

        StripeObject stripeObject = event.getDataObjectDeserializer()
            .getObject()
            .orElseThrow(() -> {
                log.error("could not deserialize stripe event");
                return new ResponseStatusException(HttpStatus.BAD_REQUEST, "could not deserialize event");
            });


        if (!(stripeObject instanceof PaymentIntent intent)) {
            return;
        }

        switch (event.getType()) {
            case "payment_intent.succeeded" -> handleSuccess(intent);
            case "payment_intent.payment_failed" -> handleFailure(intent);
            default -> log.info("unhandled stripe event type: {}", event.getType());
        }

    }
    

    public void cancelIntent(String intentId) {
        try {
            PaymentIntent.retrieve(intentId).cancel();
        } catch (StripeException e) {
            log.warn("failed to cancel intent {}, check manually", intentId);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to cancel on stripe's end");
        }
    }

    private void handleSuccess(PaymentIntent intent) {
        Order order = findOrderOrLog(intent.getId());
        if (order == null) return;
        if (order.getStatus() != Status.AWAITING_PAYMENT) return;
        order.setStatus(Status.PROCESSING);
        orderRepository.save(order);
        log.info("order {} moved to PROCESSING after successful payment", order.getId());
    }

    private void handleFailure(PaymentIntent intent) {
        Order order = findOrderOrLog(intent.getId());
        if (order == null) return;
        if (order.getStatus() != Status.AWAITING_PAYMENT) return;
        eventPublisher.publishEvent(new PaymentFailedEvent(order.getClient(), order.getId()));
        try {
            intent.cancel();
        } catch (StripeException e) {
            log.warn("failed to cancel intent {}, check manually", intent.getId());
        }
        log.warn("order {} cancelled after payment failure", order.getId());
    }

    private Order findOrderOrLog(String paymentIntentId) {
        return orderRepository.findByStripePaymentIntentId(paymentIntentId)
            .orElseGet(() -> {
                log.warn("no order found for payment intent {}", paymentIntentId);
                return null;
            });
    }
}
