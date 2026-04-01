package com.bijou.backend.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.bijou.backend.entities.Role;

public record VerboseClientProfileResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    String address,
    String postalCode,
    String city,
    String language,
    String country,
    LocalDateTime createdOn,
    Role role,
    String stripeCustomerId,
    int nbSuccessfulOrders,
    BigDecimal moneySpent
) {}
