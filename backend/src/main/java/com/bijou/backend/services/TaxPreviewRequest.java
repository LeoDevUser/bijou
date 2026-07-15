package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.Country;

public record TaxPreviewRequest(
    List<OrderItemRequest> items,
    Country country,
    Currency currency,
    String state
) {}
