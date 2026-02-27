package com.bijou.backend.auth;

public record RegisterRequest(
    String email,
    String password,
    String firstName,
    String lastName,
    String address
) {}

