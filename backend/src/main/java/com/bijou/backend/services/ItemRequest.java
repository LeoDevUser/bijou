package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.JewelryMaterial;
import com.bijou.backend.entities.PricingFormula;

public record ItemRequest(
    int stock,
    float price,
    String nameEn,
    String nameFr,
    String nameEs,
    List<Long> labelIds,
    Long categoryId,
    String descriptionEn,
    String descriptionFr,
    String descriptionEs,
    Integer discountPercent,
    JewelryMaterial material,
    boolean usmcaQualified,
    float weightGrams,
    PricingFormula pricingFormula,
    Float pricingWork,
    Float pricingMargin
) {}
