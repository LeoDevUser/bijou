package com.bijou.backend.services;

import java.math.BigDecimal;

/**
 * @param goldIvaWaivable IVA charged on gold lines at 16 % (domestic orders only).
 *                        The amount a factura removes from the order — already
 *                        excluded from {@code taxAmount} when one was requested.
 *                        Informational: never part of {@link #total()}.
 */
public record TaxResult(
        BigDecimal dutyAmount,
        BigDecimal taxAmount,
        BigDecimal handlingFee,
        BigDecimal goldIvaWaivable) {

    public BigDecimal total() {
        return dutyAmount.add(taxAmount).add(handlingFee);
    }
}
