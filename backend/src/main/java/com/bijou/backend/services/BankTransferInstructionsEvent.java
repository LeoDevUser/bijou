package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.Language;

public record BankTransferInstructionsEvent(
    String email,
    String firstName,
    Language language,
    Long orderId,
    List<ItemLine> items,
    BigDecimal total,
    BigDecimal dutyAmount,
    BigDecimal taxAmount,
    BigDecimal handlingFee,
    BigDecimal shippingFee,
    String addressLine1,
    String city,
    String postalCode,
    Country country,
    // SPEI bank details from Stripe
    String clabe,
    String bankName,
    String reference,
    String hostedInstructionsUrl
) {
    public record ItemLine(String name, int quantity, BigDecimal unitPrice) {}
}
