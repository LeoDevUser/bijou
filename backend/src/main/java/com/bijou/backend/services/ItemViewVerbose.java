package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import com.bijou.backend.entities.Category;

public record ItemViewVerbose(
        Long id,
        Integer stock,
        String nameEn,
        String nameFr,
        String nameEs,
        BigDecimal price,
        List<LabelView> labels,
        Category category,
        String descriptionEn,
        String descriptionFr,
        String descriptionEs,
        List<ItemAssetView> assets,
        int nbSold,
        int nbSoldMonth,
        BigDecimal totalSales,
        BigDecimal totalSalesWeek,
        BigDecimal totalSalesMonth,
        BigDecimal totalSalesQuarter,
        BigDecimal totalSalesYear,
        boolean active,
        Integer discountPercent
) {}
