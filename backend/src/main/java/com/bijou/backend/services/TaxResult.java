package com.bijou.backend.services;

import java.math.BigDecimal;

public record TaxResult(BigDecimal dutyAmount, BigDecimal taxAmount) {
    public BigDecimal total() {
        return dutyAmount.add(taxAmount);
    }
}
