package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.Category;

public record ItemRequest(
    int stock,
    float price,
    String nameEn,
    String nameFr,
    String nameEs,
    List<Long> labelIds,
    Category category,
    String descriptionEn,
    String descriptionFr,
    String descriptionEs
) {}
