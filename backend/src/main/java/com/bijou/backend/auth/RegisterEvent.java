package com.bijou.backend.auth;

import com.bijou.backend.entities.Language;

public record RegisterEvent(
    String firstName,
    String lastName,
    Language language,
    String email
) {}
