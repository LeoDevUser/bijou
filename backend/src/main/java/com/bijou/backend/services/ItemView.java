package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import com.bijou.backend.entities.JewelryMaterial;

public record ItemView(
        Long id,
        Integer stock,
        String nameEn,
        String nameFr,
        String nameEs,
        BigDecimal price,
        List<LabelView> labels,
        CategoryView category,
        String descriptionEn,
        String descriptionFr,
        String descriptionEs,
        List<ItemAssetView> assets,
        Integer discountPercent,
        JewelryMaterial material,
        boolean usmcaQualified,
        float weightGrams
) {}
