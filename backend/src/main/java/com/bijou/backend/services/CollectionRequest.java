package com.bijou.backend.services;

public record CollectionRequest(
        Long labelId,
        String headerEn,
        String headerFr,
        String headerEs,
        String subheaderEn,
        String subheaderFr,
        String subheaderEs,
        String color) {
}
