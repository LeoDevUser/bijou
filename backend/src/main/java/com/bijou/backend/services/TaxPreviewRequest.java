package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.Country;

/**
 * @param facturaRequested mirrors the checkout's factura toggle — gold is
 *                         IVA-exempt only against a factura, so the preview has
 *                         to know before it can quote a total.
 */
public record TaxPreviewRequest(
    List<OrderItemRequest> items,
    Country country,
    Currency currency,
    String state,
    boolean facturaRequested
) {}
