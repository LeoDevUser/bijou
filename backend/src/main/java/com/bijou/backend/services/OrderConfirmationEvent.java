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
    BigDecimal dutyAmount,
    BigDecimal taxAmount,
    BigDecimal handlingFee,
    String addressLine1,
    String city,
    String postalCode,
    Country country,
    String oxxoVoucherUrl,   // null for card/bank transfer payments
    Integer installments,    // null if not MSI
    boolean oxxoPayment,     // true if order was paid via OXXO method
    boolean bankTransfer     // true if order was paid via bank transfer
) {
    public record ItemLine(String name, int quantity, BigDecimal unitPrice) {}
}
