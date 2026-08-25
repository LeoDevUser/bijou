package com.bijou.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "item_assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    /**
     * When set, this asset belongs to that single size rather than to the item as
     * a whole: the storefront shows it only while that size is selected, and it is
     * excluded from {@link Item#getAssets()}. Null (the default, and what every
     * pre-existing row holds) means item-level — the shared gallery a size falls
     * back to when it has no assets of its own. {@code item_id} stays set either
     * way so an asset is always reachable from its item.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_size_id")
    private ItemSize itemSize;

    private String imageUrl;
    private String imageId;
    @Column(nullable = false)
    private String resourceType;
    @Column(nullable = false)
    private int sortOrder;
    /** true = uploaded by us (delete from Cloudinary on removal); false = picked from existing library (do not delete). */
    @Builder.Default
    @Column(nullable = false)
    private boolean owned = true;
}
