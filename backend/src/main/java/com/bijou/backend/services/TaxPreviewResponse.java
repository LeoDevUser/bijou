package com.bijou.backend.services;

import java.math.BigDecimal;

public record TaxPreviewResponse(
    BigDecimal subtotal,
    BigDecimal dutyAmount,
    BigDecimal taxAmount,
    BigDecimal handlingFee,
    BigDecimal total
) {}
