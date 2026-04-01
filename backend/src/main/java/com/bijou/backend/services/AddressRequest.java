package com.bijou.backend.services;

public record AddressRequest(
        String address,
        String postalCode,
        String city,
        String country
) {}
