package com.bijou.backend.services;

import java.util.List;

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
        String taglineEn,
        String taglineFr,
        String taglineEs,
        String color,
        String headerColor,
        String subheaderColor,
        String taglineColor,
        List<Long> ctaCategoryIds,
        List<Long> ctaLabelIds) {
}
