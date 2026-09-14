package com.bijou.backend.services;

import jakarta.validation.constraints.NotNull;

/**
 * Admin payload for a single variant. {@code price} is only used when the parent
 * item is static-priced; for formula-priced items the price is computed from
 * {@code weightGrams}. {@code pricingWork} optionally overrides the item's work
 * input, and the description fields override the item's when non-blank.
 *
 * <p>A variant is named by its style, its size, or both — at least one must be
 * filled. The swatch fields carry a picture picked from the media library for the
 * style; an uploaded one arrives through the swatch endpoint instead, and is
 * echoed back here unchanged on the next edit so a save never drops it.</p>
 */
public record ItemSizeRequest(
        String sizeEn,
        String sizeFr,
        String sizeEs,
        String styleEn,
        String styleFr,
        String styleEs,
        String swatchImageUrl,
        String swatchImageId,
        @NotNull
        Integer stock,
        float weightGrams,
        Float price,
        Float pricingWork,
        String descriptionEn,
        String descriptionFr,
        String descriptionEs
) {}
