package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.Language;

public record OrderConfirmationEvent(
    String email,
    String firstName,
    Language language,
    Long orderId,
    List<ItemLine> items,
    BigDecimal total,
    String address,
    String city,
    String postalCode,
    Country country,
    String oxxoVoucherUrl  // null for card payments
) {
    public record ItemLine(String name, int quantity, BigDecimal unitPrice) {}
}
