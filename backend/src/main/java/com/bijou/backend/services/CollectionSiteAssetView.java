package com.bijou.backend.services;

public record CollectionSiteAssetView(
        Long id,
        String slot,
        String imageUrl,
        String imageId,
        String resourceType,
        String headerEn,
        String headerFr,
        String headerEs,
        String subheaderEn,
        String subheaderFr,
        String subheaderEs,
        String color,
        String ctaCategory,
        Long ctaLabelId) {
}
