package com.bijou.backend.auth;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
    @NotBlank
    String oldPassword,
    @NotBlank
    String newPassword
) {}
