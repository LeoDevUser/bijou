package com.bijou.backend.services;

public record ClientProfileResponse(
        String firstName,
        String lastName,
        String email,
        String address,
        String language
){}
