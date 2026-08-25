package com.bijou.backend.services;

/**
 * Target scope for copying an existing asset on an item: {@code sizeId} names the
 * size that should get its own copy, or null for the item's shared gallery. The
 * source keeps its image — taking one is not removing it from where it came from.
 */
public record AssetSizeRequest(Long sizeId) {}
