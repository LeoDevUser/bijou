package com.bijou.backend.entities;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "collection_site_assets",
        uniqueConstraints = @UniqueConstraint(columnNames = {"collection_id", "slot"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionSiteAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_id", nullable = false)
    private Collection collection;

    @Column(nullable = false)
    private String slot;

    private String imageUrl;
    private String imageId;

    @Builder.Default
    private String resourceType = "image";

    private String headerEn;
    private String headerFr;
    private String headerEs;

    private String subheaderEn;
    private String subheaderFr;
    private String subheaderEs;

    private String taglineEn;
    private String taglineFr;
    private String taglineEs;

    /** Fallback colour for any text in this slot that has no colour of its own. */
    private String baseTextColor;
    private String headerTextColor;
    private String subheaderTextColor;
    private String taglineTextColor;

    /** CTA button, resting state. Null falls back to the slot's text colour / transparent. */
    private String ctaTextColor;
    private String ctaBorderColor;
    private String ctaBgColor;

    /** CTA button, hover state. Null keeps the resting colour; all three null = fade to 75% opacity. */
    private String ctaHoverTextColor;
    private String ctaHoverBorderColor;
    private String ctaHoverBgColor;

    /**
     * Heading the shop page shows in place of its default title when a shopper arrives
     * through this CTA. Null or blank leaves the shop to name itself after whichever
     * filter is applied.
     */
    private String ctaTitleEn;
    private String ctaTitleFr;
    private String ctaTitleEs;

    /**
     * Where the slot's text block (subheader, header and CTA together) sits inside the
     * panel, as a percentage of the panel's width and height to the block's centre.
     * Null on both leaves the block centred the way it has always been. The mobile pair
     * falls back to the desktop one, so a slot only needs its own mobile placement when
     * the artwork puts the text somewhere else on a narrow screen.
     */
    private Double textPosX;
    private Double textPosY;
    private Double textPosXMobile;
    private Double textPosYMobile;

    /** Categories the CTA links to (item category ids). Empty = no category filter. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "collection_asset_cta_categories", joinColumns = @JoinColumn(name = "asset_id"))
    @Column(name = "category_id")
    @Builder.Default
    private List<Long> ctaCategoryIds = new ArrayList<>();

    /** Labels the CTA links to (label ids). Empty = no label filter. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "collection_asset_cta_labels", joinColumns = @JoinColumn(name = "asset_id"))
    @Column(name = "label_id")
    @Builder.Default
    private List<Long> ctaLabelIds = new ArrayList<>();

    /**
     * Collections the CTA links to (collection ids). Empty = no collection filter.
     * The shop rolls each one up over its subcollections, so linking a parent lands
     * on everything beneath it.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "collection_asset_cta_collections", joinColumns = @JoinColumn(name = "asset_id"))
    @Column(name = "target_collection_id")
    @Builder.Default
    private List<Long> ctaCollectionIds = new ArrayList<>();
}
