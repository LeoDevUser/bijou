package com.bijou.backend.services;

import java.math.BigDecimal;

import com.bijou.backend.entities.Store;

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
    boolean active,
    // Admin-only: the item's owning store. Null on customer-facing views.
    Store store
) {}
