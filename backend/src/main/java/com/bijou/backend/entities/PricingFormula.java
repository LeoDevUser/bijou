package com.bijou.backend.entities;

import java.math.BigDecimal;

/**
 * Dynamic pricing formula for an item, driven by the daily metal spot price:
 *
 *   price = ceil10( mxnPerGram(metal) × factor × weightGrams + margin )
 *
 * where ceil10 rounds UP to the next multiple of 10 MXN and margin (m) is a
 * per-item amount set by the admin. Factors encode metal purity plus the
 * house premium (10k = 41.7% pure, 14k = 58.3% pure).
 */
public enum PricingFormula {
    NONE(null, null),
    GOLD_10K(MetalKind.GOLD, new BigDecimal("0.445")),
    GOLD_14K(MetalKind.GOLD, new BigDecimal("0.616")),
    SILVER_925(MetalKind.SILVER, BigDecimal.ONE);

    public enum MetalKind { GOLD, SILVER }

    private final MetalKind metal;
    private final BigDecimal factor;

    PricingFormula(MetalKind metal, BigDecimal factor) {
        this.metal = metal;
        this.factor = factor;
    }

    public MetalKind metal() { return metal; }
    public BigDecimal factor() { return factor; }
}
