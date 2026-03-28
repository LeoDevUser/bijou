package com.bijou.backend.services;

public record SiteAssetTextRequest(String headerEn, String headerFr, String headerEs, String subheaderEn, String subheaderFr, String subheaderEs, String color, String ctaCategory, Long ctaLabelId) {}
