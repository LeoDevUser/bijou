package com.bijou.backend.services;

public record OrderItemRequest(
        Long itemId,
        int quantity
) {}
