package com.bijou.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
    @NotBlank @Email
    String email,
    @NotBlank
    String password,
    @NotBlank
    String firstName,
    @NotBlank
    String lastName,
    @NotBlank
    String addressLine1,
    String addressLine2,
    String colonial,
    @NotBlank
    String city,
    @NotBlank
    String state,
    @NotBlank
    String postalCode,
    @NotBlank
    String country,
    @NotBlank
    String phoneNumber,
    @NotBlank
    String language
) {}
