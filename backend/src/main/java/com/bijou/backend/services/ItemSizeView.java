package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

/**
 * @param assets media scoped to this variant. Empty means it shows the item's
 *               own gallery instead — clients apply that fallback, so this field
 *               always reports what is actually assigned to the variant.
 */
public record ItemSizeView(
        Long id,
        String sizeEn,
        String sizeFr,
        String sizeEs,
        String styleEn,
        String styleFr,
        String styleEs,
        String swatchImageUrl,
        String swatchImageId,
        Integer stock,
        Long version,
        float weightGrams,
        BigDecimal price,
        BigDecimal pricingWork,
        String descriptionEn,
        String descriptionFr,
        String descriptionEs,
        int sortOrder,
        boolean active,
        List<ItemAssetView> assets
) {}
