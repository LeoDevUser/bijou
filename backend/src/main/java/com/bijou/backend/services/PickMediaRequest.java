package com.bijou.backend.services;

public record PickMediaRequest(
        String publicId,
        String resourceType,
        String secureUrl) {
}
