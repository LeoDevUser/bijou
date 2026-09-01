package com.bijou.backend.entities;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
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

    /**
     * Free-text size label per language, e.g. "60 cm", "Size 7", "Chica". At least one
     * is always filled; the others fall back through {@code pickLocale} on the client.
     * Replaces the single {@code size} column, which {@code ItemSizeLocaleBackfill}
     * copies across and drops.
     */
    private String sizeEn;
    private String sizeFr;
    private String sizeEs;

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

    /**
     * Media shown only while this size is selected. Empty is the normal case and
     * means "use the item's gallery" — the images the item had before it was split
     * into sizes — so a size never has to restate shots that apply to all of them.
     */
    @OneToMany(mappedBy = "itemSize", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<ItemAsset> assets = new ArrayList<>();

    /**
     * The label for contexts that carry no language of their own — server logs, and the
     * snapshot written onto an order line. English first, then whatever is filled in.
     */
    public String label() {
        if (sizeEn != null && !sizeEn.isBlank()) return sizeEn;
        if (sizeFr != null && !sizeFr.isBlank()) return sizeFr;
        if (sizeEs != null && !sizeEs.isBlank()) return sizeEs;
        return "";
    }
}
