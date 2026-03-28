package com.bijou.backend.services;

public record SiteAssetView(Long id, String slot, String imageUrl, String imageId, String resourceType, String header, String subheader, String color, String ctaCategory, Long ctaLabelId) {}
