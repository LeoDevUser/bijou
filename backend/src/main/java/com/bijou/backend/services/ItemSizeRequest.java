package com.bijou.backend.services;

import jakarta.validation.constraints.NotNull;

/**
 * Admin payload for a single size. {@code price} is only used when the parent
 * item is static-priced; for formula-priced items the price is computed from
 * {@code weightGrams}. {@code pricingWork} optionally overrides the item's work
 * input, and the description fields override the item's when non-blank.
 */
public record ItemSizeRequest(
        String sizeEn,
        String sizeFr,
        String sizeEs,
        @NotNull
        Integer stock,
        float weightGrams,
        Float price,
        Float pricingWork,
        String descriptionEn,
        String descriptionFr,
        String descriptionEs
) {}
