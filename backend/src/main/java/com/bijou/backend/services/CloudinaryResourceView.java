package com.bijou.backend.services;

public record CloudinaryResourceView(
        String publicId,
        String resourceType,
        String format,
        long bytes,
        String createdAt,
        String secureUrl,
        String displayName) {
}
