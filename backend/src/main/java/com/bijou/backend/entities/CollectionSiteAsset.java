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

    private String color;
    private String headerColor;
    private String subheaderColor;
    private String taglineColor;

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
}
