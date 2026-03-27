package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import com.bijou.backend.entities.Category;

public record ItemView(
        Long id,
        Integer stock,
        String name,
        BigDecimal price,
        List<LabelView> labels,
        Category category,
        String description,
        String imageUrl,
        String imageId
) {}
