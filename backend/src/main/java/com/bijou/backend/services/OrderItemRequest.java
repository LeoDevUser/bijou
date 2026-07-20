package com.bijou.backend.services;

public record OrderItemRequest(
        Long itemId,
        Long sizeId,
        int quantity
) {}
