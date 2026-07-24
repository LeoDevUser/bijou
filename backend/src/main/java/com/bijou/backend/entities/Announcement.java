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
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "announcements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Announcement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    private Long version;

    private String textEn;
    private String textFr;
    private String textEs;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    /** Categories the CTA filters the shop by (item category ids). Empty = no category filter. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "announcement_cta_categories", joinColumns = @JoinColumn(name = "announcement_id"))
    @Column(name = "category_id")
    @Builder.Default
    private List<Long> ctaCategoryIds = new ArrayList<>();

    /** Labels the CTA filters the shop by (label ids). Empty = no label filter. */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "announcement_cta_labels", joinColumns = @JoinColumn(name = "announcement_id"))
    @Column(name = "label_id")
    @Builder.Default
    private List<Long> ctaLabelIds = new ArrayList<>();

    /** When set, the CTA links to this collection page instead of a shop filter. */
    private Long ctaCollectionId;
}
