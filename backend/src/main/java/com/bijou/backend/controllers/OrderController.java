package com.bijou.backend.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.bijou.backend.entities.Client;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.entities.Order;
import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.Status;
import com.bijou.backend.services.OrderRequest;
import com.bijou.backend.services.OrderService;
import com.bijou.backend.services.OrderView;
import com.bijou.backend.services.PaymentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;
    private final PaymentService paymentService;

    @PostMapping("/api/orders")
    public ResponseEntity<OrderCreateResponse> createOrder(@AuthenticationPrincipal Client client ,@Valid @RequestBody OrderRequest req) {
        try {
            Order order = orderService.create(client, req);
            String clientSecret = paymentService.createPaymentIntent(client, order, req.currency());
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(new OrderCreateResponse(orderService.toOrderView(order), clientSecret));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            //order may exist without a payment intent
            //cleanup job will handle it, but log clearly
            log.error("payment intent creation failed after order saved: {}", e.getMessage());
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "ORDER_PAYMENT_INIT_FAILED");
        }
    }

    @GetMapping("/api/orders")
    public ResponseEntity<List<OrderView>> getOrders(@AuthenticationPrincipal Client client) {
        return ResponseEntity.ok(orderService.getOrders(client));
    }

    @PatchMapping("/api/orders/{id}/cancel")
    public ResponseEntity<Void> cancelOrder(@AuthenticationPrincipal Client client, @PathVariable Long id) {
        paymentService.cancelIntent(orderService.cancel(client, id));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/orders/{id}/client-secret")
    public ResponseEntity<ClientSecretResponse> getClientSecret(@AuthenticationPrincipal Client client, @PathVariable Long id) {
        return ResponseEntity.ok(new ClientSecretResponse(paymentService.getClientSecret(client, id)));
    }

    @GetMapping("/${ADMIN_PAGE}/orders/{id}")
    public ResponseEntity<OrderView> getOrder(@AuthenticationPrincipal Client client, @PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrder(client, id));
    }

    @GetMapping("/${ADMIN_PAGE}/orders/status/{status}")
    public ResponseEntity<List<OrderView>> getAllOrdersByStatus(@AuthenticationPrincipal Client client, @PathVariable Status status) {
        return ResponseEntity.ok(orderService.getOrdersByStatus(client, status));
    }

    @GetMapping("/${ADMIN_PAGE}/orders")
    public ResponseEntity<List<OrderView>> getAllOrders(@AuthenticationPrincipal Client client) {
        return ResponseEntity.ok(orderService.getAllOrders(client));
    }

    @GetMapping("/${ADMIN_PAGE}/orders/country/{c}")
    public ResponseEntity<List<OrderView>> getAllOrdersByCountry(@PathVariable Country c){
        return ResponseEntity.ok(orderService.getOrdersByCountry(c));
    }

    @PatchMapping("/${ADMIN_PAGE}/orders/status")
    public ResponseEntity<Void> changeStatus(@Valid @RequestBody StatusChangeRequest req) {
        orderService.changeStatus(req.id(), req.status());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/${ADMIN_PAGE}/orders/tracking")
    public ResponseEntity<Void> changeStatus(@Valid @RequestBody TrackingChangeRequest req) {
        orderService.setTracking(req.id(), req.tracking());
        return ResponseEntity.ok().build();
    }
}
