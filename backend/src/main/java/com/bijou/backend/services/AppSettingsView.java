package com.bijou.backend.services;

public record AppSettingsView(
    boolean smtpRelayEnabled,
    int emailsSentThisMonth,
    Integer rateLimitRemaining,
    Long rateLimitReset,
    String disabledReason
) {}
