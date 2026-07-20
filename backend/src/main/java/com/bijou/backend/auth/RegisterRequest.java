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
    // Address + phone are optional at sign-up (Mexico-only launch). They are
    // collected at checkout instead, where they become required if still missing.
    String addressLine1,
    String addressLine2,
    String colonial,
    String city,
    String state,
    String postalCode,
    String country,
    String phoneNumber,
    @NotBlank
    String language
) {}
