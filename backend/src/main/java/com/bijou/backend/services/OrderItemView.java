package com.bijou.backend.services;

import java.math.BigDecimal;

public record OrderItemView(
    Long itemId,
    BigDecimal unitPrice,
    int quantity
) {}
