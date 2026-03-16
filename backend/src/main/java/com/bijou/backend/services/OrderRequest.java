package com.bijou.backend.services;

import java.util.List;

public record OrderRequest(
    List<OrderItemRequest> items,
    String address
){}
