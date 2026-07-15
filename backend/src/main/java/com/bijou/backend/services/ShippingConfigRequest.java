package com.bijou.backend.services;

import java.math.BigDecimal;

public record ShippingConfigRequest(
    BigDecimal standardShippingFee,
    BigDecimal extendedShippingFee,
    BigDecimal freeShippingThreshold
) {}
