package com.bijou.backend.services;

import com.bijou.backend.entities.Language;

public record PasswordChangedEvent(String email, String firstName, Language language) {}
