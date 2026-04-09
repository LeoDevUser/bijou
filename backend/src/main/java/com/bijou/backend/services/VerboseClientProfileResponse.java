package com.bijou.backend.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.bijou.backend.entities.Role;

public record VerboseClientProfileResponse(
    Long id,
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
    LocalDateTime createdOn,
    Role role,
    String stripeCustomerId,
    int nbSuccessfulOrders,
    BigDecimal moneySpent
) {}
