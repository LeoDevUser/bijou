package com.bijou.backend.services;

import java.math.BigDecimal;

import com.bijou.backend.entities.Store;

/**
 * One store's part of an order, for the admin split. {@code ratio} is the store's
 * share of the item subtotal (0–1); {@code fees} (shipping + handling + duty) and
 * {@code tax} are the order's amounts split by that same ratio.
 */
public record StoreShareView(
    Store store,
    BigDecimal subtotal,
    BigDecimal ratio,
    BigDecimal fees,
    BigDecimal tax
) {}
