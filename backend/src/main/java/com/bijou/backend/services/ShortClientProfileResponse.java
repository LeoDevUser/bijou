package com.bijou.backend.services;

public record ShortClientProfileResponse(
        String firstName,
        String LastName,
        Long id,
        String email
) {}
