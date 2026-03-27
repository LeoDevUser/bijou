package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.Category;

public record ItemRequest(
    int stock,
    float price,
    String name,
    List<Long> labelIds,
    Category category,
    String description
) {}
