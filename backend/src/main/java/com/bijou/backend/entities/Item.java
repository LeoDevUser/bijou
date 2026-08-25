package com.bijou.backend.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "items")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Item {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    private Long version;
    @Column(nullable=false)
    private Integer stock;
    @Column(nullable=false)
    private BigDecimal price;
    private String nameEn;
    private String nameFr;
    private String nameEs;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "item_labels",
        joinColumns = @JoinColumn(name = "item_id"),
        inverseJoinColumns = @JoinColumn(name = "label_id")
    )
    private List<Label> labels;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "item_categories",
        joinColumns = @JoinColumn(name = "item_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    @Builder.Default
    private List<Category> categories = new ArrayList<>();
    /**
     * The item's own gallery. Assets scoped to a single size are excluded by the
     * restriction below — they live on {@link ItemSize#getAssets()} instead, and a
     * size with none of its own falls back to this list.
     */
    @OneToMany(mappedBy = "item", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    @SQLRestriction("item_size_id is null")
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<ItemAsset> assets = new ArrayList<>();
    /** Optional sizes. When non-empty, per-size stock/weight/price override the item's own. */
    @OneToMany(mappedBy = "item", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<ItemSize> sizes = new ArrayList<>();
    @Column(nullable = false)
    @Builder.Default
    private int nbSold = 0;
    @Builder.Default
    private int nbSoldMonth = 0;
    @Builder.Default
    private BigDecimal totalSalesWeek = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalSalesMonth = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalSalesQuarter = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalSalesYear = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalSales = BigDecimal.ZERO;
    @Builder.Default
    private boolean active = true;
    // Long-form descriptions — TEXT so they aren't capped at the default VARCHAR(255)
    @Column(columnDefinition = "TEXT")
    private String descriptionEn;
    @Column(columnDefinition = "TEXT")
    private String descriptionFr;
    @Column(columnDefinition = "TEXT")
    private String descriptionEs;
    private Integer discountPercent;
    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private JewelryMaterial material;
    @Builder.Default
    @Column(nullable = false)
    private boolean usmcaQualified = false;
    /** Weight in grams. */
    @Column(nullable = false)
    private float weightGrams;
    /**
     * True when the admin types this item's static price with the 16 % IVA already
     * applied — the figure the client sees billed, rather than the taxable base.
     * {@link #price} (and each size's price) always stores the net amount either
     * way; this only records how it was entered, so the admin form can round-trip
     * the same number and the sizes panel can stay in the same mode.
     * Ignored for formula-priced items, whose price is computed net by design.
     */
    // columnDefinition carries the default so Postgres can backfill existing rows
    // when ddl-auto adds the column — a bare NOT NULL add fails on a populated table.
    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean priceIncludesTax = false;
    /** Metal-indexed pricing formula; null or NONE = static admin-entered price. */
    @Enumerated(EnumType.STRING)
    private PricingFormula pricingFormula;
    /** w in the pricing formula: work on the piece, MXN per gram (scales with weight). */
    private BigDecimal pricingWork;
    /** m in the pricing formula: markup percentage over wholesale cost (e.g. 47 = +47%). */
    private BigDecimal pricingMargin;
}
