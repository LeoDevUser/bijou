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
        String imageUrl,
        String imageId,
        int nbSold,
        BigDecimal totalSales,
        boolean active
) {}
