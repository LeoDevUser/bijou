package com.bijou.backend.services;

import java.math.BigDecimal;

/**
 * @param goldIvaWaivable IVA on the cart's gold pieces — what requesting a
 *                        factura saves, or (when one was requested) what it
 *                        already saved. Zero when the cart holds no gold.
 */
public record TaxPreviewResponse(
    BigDecimal subtotal,
    BigDecimal dutyAmount,
    BigDecimal taxAmount,
    BigDecimal handlingFee,
    BigDecimal shippingFee,
    BigDecimal total,
    BigDecimal goldIvaWaivable
) {}
