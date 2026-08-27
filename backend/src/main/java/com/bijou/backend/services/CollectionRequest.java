package com.bijou.backend.services;

import java.util.List;

public record CollectionRequest(
        List<Long> labelIds,
        List<Long> categoryIds,
        String headerEn,
        String headerFr,
        String headerEs,
        String subheaderEn,
        String subheaderFr,
        String subheaderEs,
        String cardTextColor,
        Long parentId,
        Integer sortOrder) {
}
