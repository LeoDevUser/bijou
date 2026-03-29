package com.bijou.backend.repositories;

import java.math.BigDecimal;

public record SalesStats(
    BigDecimal total,
    BigDecimal week,
    BigDecimal month,
    BigDecimal quarter,
    BigDecimal year
) {}
