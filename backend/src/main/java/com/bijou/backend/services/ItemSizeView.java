package com.bijou.backend.services;

import java.math.BigDecimal;

public record ItemSizeView(
        Long id,
        String size,
        Integer stock,
        Long version,
        float weightGrams,
        BigDecimal price,
        BigDecimal pricingWork,
        String descriptionEn,
        String descriptionFr,
        String descriptionEs,
        int sortOrder,
        boolean active
) {}
