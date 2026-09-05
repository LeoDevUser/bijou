package com.bijou.backend.entities;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "collections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Collection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    private Long version;

    /**
     * Parent collection, when this one is a subcollection. Null for a top-level
     * collection. Eager like the rest of the entity: the tree is a handful of rows
     * deep and open-in-view is off, so a lazy proxy would be unusable in the views.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "parent_id")
    private Collection parent;

    /** Display order among siblings (ties broken by id). */
    @Builder.Default
    @Column(columnDefinition = "integer default 0")
    private Integer sortOrder = 0;

    /**
     * Explicit display order for this collection's items, as item ids. Membership stays
     * derived from labels and categories — this only says where a listed item sits on the
     * page. Items that match the collection but are absent here fall in after the listed
     * ones, keeping the order the query hands back, so a partial list is a valid list.
     * Ids are matched against the items actually collected, so an id left behind by a
     * deleted item simply never lands.
     */
    @Builder.Default
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "collection_item_order", joinColumns = @JoinColumn(name = "collection_id"))
    @Column(name = "item_id")
    @OrderColumn(name = "position")
    private List<Long> itemOrder = new ArrayList<>();

    @Builder.Default
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "collection_labels",
            joinColumns = @JoinColumn(name = "collection_id"),
            inverseJoinColumns = @JoinColumn(name = "label_id"))
    private List<Label> labels = new ArrayList<>();

    @Builder.Default
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "collection_categories",
            joinColumns = @JoinColumn(name = "collection_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    private List<Category> categories = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "collection", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<CollectionSiteAsset> siteAssets = new ArrayList<>();

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

    /** Default text colour for this collection's card on the collections grid. */
    private String cardTextColor;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private boolean isMain = false;
}
