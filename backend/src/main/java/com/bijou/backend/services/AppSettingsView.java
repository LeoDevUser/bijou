package com.bijou.backend.services;

public record AppSettingsView(
    boolean smtpRelayEnabled,
    String disabledReason
) {}
