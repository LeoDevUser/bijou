package com.bijou.backend.services;

import java.math.BigDecimal;

public record OrderItemView(
    Long itemId,
    String sizeLabel,
    BigDecimal unitPrice,
    int quantity,
    String nameEn,
    String nameFr,
    String nameEs,
    String imageUrl,
    String resourceType,
    boolean active
) {}
