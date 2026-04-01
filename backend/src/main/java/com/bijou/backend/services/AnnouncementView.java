package com.bijou.backend.services;

public record AnnouncementView(Long id, String textEn, String textFr, String textEs, boolean active, int sortOrder,
        String ctaCategory, Long ctaLabelId, Long ctaCollectionId) {}
