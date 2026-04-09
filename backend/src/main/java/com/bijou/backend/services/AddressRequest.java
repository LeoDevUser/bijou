package com.bijou.backend.services;

public record AddressRequest(
    String addressLine1,
    String addressLine2,
    String colonial,
    String city,
    String state,
    String postalCode,
    String country,
    String phoneNumber
) {}
