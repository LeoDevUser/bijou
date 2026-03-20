package com.bijou.backend.services;

public record CloudinaryResponse(
    String imageId,
    String url,
    String format,
    long bytes
) {}
