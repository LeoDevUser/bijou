package com.bijou.backend.services;

import java.util.List;

public record CollectionView(
        Long id,
        List<LabelView> labels,
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
        List<CollectionSiteAssetView> siteAssets,
        CollectionThemeView theme,
        boolean active,
        boolean isMain) {
}
