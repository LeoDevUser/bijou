package com.bijou.backend.services;

/** Relative stock change (+restock / −correction), applied atomically. */
public record StockAdjustRequest(int delta) {}
