package com.bijou.backend.repositories;

import java.math.BigDecimal;

public record SalesStats(
    BigDecimal total,
    BigDecimal week,
    BigDecimal month,
    BigDecimal quarter,
    BigDecimal year,
    long ordersTotal,
    long ordersWeek,
    long ordersMonth,
    long ordersQuarter,
    long ordersYear,
    BigDecimal taxTotal,
    BigDecimal taxWeek,
    BigDecimal taxMonth,
    BigDecimal taxQuarter,
    BigDecimal taxYear
) {}
