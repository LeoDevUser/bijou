package com.bijou.backend.services;

/** Storefront-facing Stripe config: the publishable key for the active mode. */
public record StripePublicConfig(String publishableKey, boolean liveMode) {}
