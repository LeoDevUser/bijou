package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.Country;

public record OrderRequest(
    List<OrderItemRequest> items,
    String address,
    String city,
    String postalCode,
    Country country,
    Currency currency,
    Integer installments
){}
