package com.bijou.backend.entities;

public enum Status {
    AWAITING_PAYMENT,
    PROCESSING,
    SHIPPED,
    CANCELLED,
    DELIVERED//this im not sure since we can only
             //really know for orders with tracking
             //and not al orders will have tracking
             //i dont think. TBD
}
