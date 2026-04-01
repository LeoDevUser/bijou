package com.bijou.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
    @NotBlank
    @Email
    String email,
    @NotBlank
    String password,
    @NotBlank
    String firstName,
    @NotBlank
    String lastName,
    @NotBlank
    String address,
    @NotBlank
    String city,
    @NotBlank
    String postalCode,
    @NotBlank
    String country,
    @NotBlank
    String language
) {}
