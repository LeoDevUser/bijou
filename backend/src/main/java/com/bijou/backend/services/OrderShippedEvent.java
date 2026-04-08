package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import com.bijou.backend.entities.Language;

public record OrderShippedEvent(
    String email,
    String firstName,
    Language language,
    Long orderId,
    String trackingNumber,
    List<ItemLine> items
) {
    public record ItemLine(String name, int quantity, BigDecimal unitPrice) {}
}
