package com.bijou.backend.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bijou.backend.services.StripeModeService;
import com.bijou.backend.services.StripePublicConfig;

import lombok.RequiredArgsConstructor;

/**
 * Serves the storefront the publishable key for whichever Stripe mode the admin
 * has selected, so Stripe.js always matches the backend's secret key. Public so
 * the checkout page can read it before authenticating.
 */
@RestController
@RequiredArgsConstructor
public class StripeConfigController {

    private final StripeModeService stripeModeService;

    @GetMapping("/public/stripe-config")
    public ResponseEntity<StripePublicConfig> get() {
        return ResponseEntity.ok(new StripePublicConfig(
            stripeModeService.publishableKey(), stripeModeService.isLiveMode()));
    }
}
