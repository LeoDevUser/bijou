package com.bijou.backend.repositories;

import java.math.BigDecimal;

/**
 * All-time sales broken down by metal type. Gold is split by karat (which is
 * carried by the item's pricing formula, GOLD_10K / GOLD_14K); silver and steel
 * are keyed off the item's {@link com.bijou.backend.entities.JewelryMaterial}.
 * Anything that doesn't map to one of those (e.g. statically-priced gold with no
 * karat formula, or OTHER material) falls into {@link #other()}.
 *
 * Each bucket carries grams sold (quantity × per-piece weight), the money total
 * (quantity × unit price) and the number of pieces sold.
 */
public record MaterialSalesStats(
    MaterialBucket gold10k,
    MaterialBucket gold14k,
    MaterialBucket silver,
    MaterialBucket steel,
    MaterialBucket other
) {
    public record MaterialBucket(BigDecimal grams, BigDecimal money, long units) {
        public static MaterialBucket zero() {
            return new MaterialBucket(BigDecimal.ZERO, BigDecimal.ZERO, 0L);
        }

        public MaterialBucket plus(BigDecimal g, BigDecimal m, long u) {
            return new MaterialBucket(grams.add(g), money.add(m), units + u);
        }
    }
}
