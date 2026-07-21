package com.bijou.backend.services;

public record ClientProfileResponse(
    String firstName,
    String lastName,
    String email,
    String addressLine1,
    String addressLine2,
    String colonial,
    String city,
    String state,
    String postalCode,
    String country,
    String phoneNumber,
    String language,
    String rfc,
    String regimenFiscal
) {}
