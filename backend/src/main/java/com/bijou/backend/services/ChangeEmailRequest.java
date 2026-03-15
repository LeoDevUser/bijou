package com.bijou.backend.services;

import jakarta.validation.constraints.NotBlank;

public record ChangeEmailRequest(
    @NotBlank
    String password,
    @NotBlank
    String newEmail
) {}

