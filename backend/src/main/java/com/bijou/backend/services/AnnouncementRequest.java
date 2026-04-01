package com.bijou.backend.services;

public record AnnouncementRequest(String textEn, String textFr, String textEs, boolean active,
        String ctaCategory, Long ctaLabelId, Long ctaCollectionId) {}
