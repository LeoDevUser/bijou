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
 * A purchasable variant of an {@link Item} — a style, a size, or a style in a
 * given size. When an item has any variants, its own
 * stock/weight/price/description become inert and the per-variant values below are
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
     * Free-text size label per language, e.g. "60 cm", "Size 7", "Chica". The others
     * fall back through {@code pickLocale} on the client. Replaces the single
     * {@code size} column, which {@code ItemSizeLocaleBackfill} copies across and drops.
     * May be blank on a style-only item, but a row is always named by at least one of
     * size or style.
     */
    private String sizeEn;
    private String sizeFr;
    private String sizeEs;

    /**
     * Free-text style label per language, e.g. "Cafe", "Azul", "Broche negro" — the
     * second axis of the picker, shown above sizes and rendered as a swatch. Blank on
     * items that only vary by size, which is every row predating styles.
     *
     * <p>Rows sharing a style are one style offered in several sizes: the storefront
     * groups by these three fields, so the swatch and label below are repeated
     * identically on each row of the group and read from the first of them.</p>
     */
    private String styleEn;
    private String styleFr;
    private String styleEs;

    /** Small image standing in for this style in the picker; null renders the label alone. */
    private String swatchImageUrl;
    private String swatchImageId;

    /**
     * true = the swatch was uploaded by us, so its Cloudinary file goes when the swatch
     * is replaced or the variant deleted; false = picked from the existing library and
     * left alone. Mirrors {@link ItemAsset#isOwned()}.
     */
    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean not null default false")
    private boolean swatchOwned = false;

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
     * Both axes are joined so an order line records the full variant that was bought.
     */
    public String label() {
        String style = pick(styleEn, styleFr, styleEs);
        String size = pick(sizeEn, sizeFr, sizeEs);
        if (style.isEmpty()) return size;
        if (size.isEmpty()) return style;
        return style + " \u00b7 " + size;
    }

    private static String pick(String en, String fr, String es) {
        if (en != null && !en.isBlank()) return en;
        if (fr != null && !fr.isBlank()) return fr;
        if (es != null && !es.isBlank()) return es;
        return "";
    }
}
