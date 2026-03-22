package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.Country;

public record OrderRequest(
    List<OrderItemRequest> items,
    String address,
    Country country,
    Currency currency
){}
