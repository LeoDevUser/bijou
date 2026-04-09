package com.bijou.backend.services;

import java.util.List;

public record ItemRequest(
    int stock,
    float price,
    String nameEn,
    String nameFr,
    String nameEs,
    List<Long> labelIds,
    Long categoryId,
    String descriptionEn,
    String descriptionFr,
    String descriptionEs,
    Integer discountPercent
) {}
