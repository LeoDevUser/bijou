package com.bijou.backend.services;

import java.util.List;

public record AnnouncementRequest(String textEn, String textFr, String textEs, boolean active,
        List<Long> ctaCategoryIds, List<Long> ctaLabelIds, Long ctaCollectionId) {}
