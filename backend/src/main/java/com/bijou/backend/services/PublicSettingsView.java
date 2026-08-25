package com.bijou.backend.services;

import java.math.BigDecimal;

/**
 * Storefront-visible slice of AppSettings. Deliberately excludes the operational
 * flags (SMTP relay, Stripe mode) that only the admin panel has any use for.
 */
public record PublicSettingsView(
    boolean msiEnabled,
    BigDecimal standardShippingFee,
    BigDecimal extendedShippingFee,
    BigDecimal freeShippingThreshold
) {}
