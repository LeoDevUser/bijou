package com.bijou.backend.services;

/**
 * Absolute stock set with an optimistic guard: {@code expectedVersion} is the
 * entity version the admin's form was loaded with. The set is rejected if a sale
 * changed stock (and thus the version) in the meantime.
 */
public record StockSetRequest(int stock, long expectedVersion) {}
