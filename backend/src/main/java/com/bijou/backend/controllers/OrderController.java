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

import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Status;
import com.bijou.backend.services.OrderRequest;
import com.bijou.backend.services.OrderService;
import com.bijou.backend.services.OrderView;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/api/orders")
    public ResponseEntity<OrderView> createOrder(@AuthenticationPrincipal Client client ,@Valid @RequestBody OrderRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.create(client, req));
    }

    @GetMapping("/api/orders")
    public ResponseEntity<List<OrderView>> getOrders(@AuthenticationPrincipal Client client) {
        return ResponseEntity.ok(orderService.getOrders(client));
    }

    @PatchMapping("/api/orders/{id}/cancel")
    public ResponseEntity<Void> cancelOrder(@AuthenticationPrincipal Client client, @PathVariable Long id) {
        orderService.cancel(client, id);
        return ResponseEntity.ok().build();
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

}
