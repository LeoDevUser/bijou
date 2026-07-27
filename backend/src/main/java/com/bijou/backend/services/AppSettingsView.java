package com.bijou.backend.services;

import java.math.BigDecimal;

public record AppSettingsView(
    boolean smtpRelayEnabled,
    String disabledReason,
    boolean msiEnabled,
    boolean stripeLiveMode,
    boolean stripeLiveConfigured,
    BigDecimal standardShippingFee,
    BigDecimal extendedShippingFee,
    BigDecimal freeShippingThreshold
) {}
