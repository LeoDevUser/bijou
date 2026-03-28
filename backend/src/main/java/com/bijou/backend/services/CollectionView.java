package com.bijou.backend.services;

public record CollectionView(
        Long id,
        Long labelId,
        String labelNameEn,
        String labelNameFr,
        String labelNameEs,
        String imageUrl,
        String imageId,
        String resourceType,
        String headerEn,
        String headerFr,
        String headerEs,
        String subheaderEn,
        String subheaderFr,
        String subheaderEs,
        String color) {
}
