package com.bijou.backend.services;

import com.bijou.backend.entities.Language;

public record FacturaEmailEvent(
    String email,
    String firstName,
    Language language,
    Long orderId,
    String facturaUrl
) {}
