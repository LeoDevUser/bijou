package com.bijou.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Human-readable display name for a Cloudinary asset, keyed by its public_id.
 * Lives in our DB so renaming never touches Cloudinary (public_id and delivery
 * URLs stay stable). Assets without a row fall back to their public_id in the
 * admin media library.
 */
@Entity
@Table(name = "media_asset_names",
        uniqueConstraints = @UniqueConstraint(columnNames = {"publicId", "resourceType"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaAssetName {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String publicId;

    @Column(nullable = false)
    private String resourceType;

    @Column(nullable = false)
    private String displayName;
}
