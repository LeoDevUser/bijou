package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.Country;

public record OrderRequest(
    List<OrderItemRequest> items,
    String addressLine1,
    String addressLine2,
    String colonial,
    String city,
    String state,
    String postalCode,
    Country country,
    Currency currency,
    Integer installments
){}
