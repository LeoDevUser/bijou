package com.bijou.backend.services;

import java.util.List;

public record AnnouncementView(Long id, String textEn, String textFr, String textEs, boolean active, int sortOrder,
        List<Long> ctaCategoryIds, List<Long> ctaLabelIds, Long ctaCollectionId) {}
