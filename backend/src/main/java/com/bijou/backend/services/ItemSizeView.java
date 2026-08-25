package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

/**
 * @param assets media scoped to this size. Empty means the size shows the item's
 *               own gallery instead — clients apply that fallback, so this field
 *               always reports what is actually assigned to the size.
 */
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
        boolean active,
        List<ItemAssetView> assets
) {}
