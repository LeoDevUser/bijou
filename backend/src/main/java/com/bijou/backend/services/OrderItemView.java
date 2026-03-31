package com.bijou.backend.services;

import java.math.BigDecimal;

public record OrderItemView(
    Long itemId,
    BigDecimal unitPrice,
    int quantity,
    String nameEn,
    String nameFr,
    String nameEs,
    String imageUrl,
    boolean active
) {}
