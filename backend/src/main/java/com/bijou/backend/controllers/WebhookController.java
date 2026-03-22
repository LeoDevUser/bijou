package com.bijou.backend.controllers;

import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.bijou.backend.services.PaymentService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final PaymentService paymentService;

    @PostMapping("/public/webhook/stripe")
    public ResponseEntity<Void> handleStripeWebhook(HttpServletRequest req, @RequestHeader("Stripe-Signature") String sigHeader) {
        try {
            String payload = req.getReader().lines()
                .collect(Collectors.joining(System.lineSeparator()));
            paymentService.handleWebhook(payload, sigHeader);

            return ResponseEntity.ok().build();
            
        } catch (Exception e) {      
            log.error("Failed to read webhook request body", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
    
}
