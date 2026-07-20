package com.bijou.backend.entities;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A purchasable size of an {@link Item}. When an item has any sizes, its own
 * stock/weight/price/description become inert and the per-size values below are
 * used instead. The pricing formula and margin stay on the parent item; a size
 * only supplies the weight (which drives the dynamic price) and, for static
 * items, its own price. Descriptions are optional overrides that fall back to
 * the item's when blank.
 */
@Entity
@Table(name = "item_sizes")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ItemSize {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    /** Free-text size label, e.g. "60 cm", "Talla 7", "Chica". */
    @Column(nullable = false)
    private String size;

    @Column(nullable = false)
    private Integer stock;

    /** Weight in grams — drives the dynamic price when the item is formula-priced. */
    @Column(nullable = false)
    private float weightGrams;

    /** Effective price of this size (compute-and-persist, mirrors {@link Item#getPrice()}). */
    @Column(nullable = false)
    private BigDecimal price;

    /** Optional per-size override of the formula "work" input; null inherits the item's. */
    private BigDecimal pricingWork;

    /** Optional description overrides; blank falls back to the item's description. */
    @Column(columnDefinition = "TEXT")
    private String descriptionEn;
    @Column(columnDefinition = "TEXT")
    private String descriptionFr;
    @Column(columnDefinition = "TEXT")
    private String descriptionEs;

    @Column(nullable = false)
    private int sortOrder;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
