package com.bijou.backend.services;

import java.util.List;

public record CollectionAssetRequest(
        String headerEn,
        String headerFr,
        String headerEs,
        String subheaderEn,
        String subheaderFr,
        String subheaderEs,
        String taglineEn,
        String taglineFr,
        String taglineEs,
        String baseTextColor,
        String headerTextColor,
        String subheaderTextColor,
        String taglineTextColor,
        String ctaTextColor,
        String ctaBorderColor,
        String ctaBgColor,
        String ctaHoverTextColor,
        String ctaHoverBorderColor,
        String ctaHoverBgColor,
        String ctaTitleEn,
        String ctaTitleFr,
        String ctaTitleEs,
        List<Long> ctaCategoryIds,
        List<Long> ctaLabelIds,
        List<Long> ctaCollectionIds) {
}
