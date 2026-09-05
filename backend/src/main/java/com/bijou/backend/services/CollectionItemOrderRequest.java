package com.bijou.backend.services;

import java.util.List;

/**
 * The admin-chosen display order for a collection's items, as item ids. Ids that no
 * longer belong to the collection are dropped on save; an empty list clears the
 * override and returns the collection to the order the query hands back.
 */
public record CollectionItemOrderRequest(List<Long> itemIds) {
}
