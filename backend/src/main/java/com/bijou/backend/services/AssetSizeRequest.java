package com.bijou.backend.services;

/**
 * Moves an existing asset between scopes on the same item: {@code sizeId} names
 * the size it should belong to, or null to send it back to the item's shared
 * gallery. The asset keeps its Cloudinary file — nothing is re-uploaded.
 */
public record AssetSizeRequest(Long sizeId) {}
