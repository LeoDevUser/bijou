package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import com.bijou.backend.entities.JewelryMaterial;
import com.bijou.backend.entities.PricingFormula;

public record ItemView(
        Long id,
        Integer stock,
        Long version,
        String nameEn,
        String nameFr,
        String nameEs,
        BigDecimal price,
        boolean priceIncludesTax,
        List<LabelView> labels,
        List<CategoryView> categories,
        String descriptionEn,
        String descriptionFr,
        String descriptionEs,
        List<ItemAssetView> assets,
        List<ItemSizeView> sizes,
        Integer discountPercent,
        JewelryMaterial material,
        boolean usmcaQualified,
        float weightGrams,
        PricingFormula pricingFormula,
        BigDecimal pricingWork,
        BigDecimal pricingMargin
) {}
