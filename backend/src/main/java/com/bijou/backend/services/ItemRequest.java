package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.JewelryMaterial;
import com.bijou.backend.entities.PricingFormula;

/**
 * @param priceIncludesTax when true, {@code price} (and the prices of this item's
 *                         sizes) arrive with 16 % IVA already applied and are
 *                         stored net. Only meaningful for static pricing.
 */
public record ItemRequest(
    int stock,
    float price,
    boolean priceIncludesTax,
    String nameEn,
    String nameFr,
    String nameEs,
    List<Long> labelIds,
    List<Long> categoryIds,
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
