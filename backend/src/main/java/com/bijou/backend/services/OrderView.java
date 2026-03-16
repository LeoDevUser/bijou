package com.bijou.backend.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.bijou.backend.entities.Status;

public record OrderView(
    String address,
    List<OrderItemView> items,
    String tracking,
    BigDecimal total,
    LocalDateTime createdAt,
    Status status,
    Long id
){}
