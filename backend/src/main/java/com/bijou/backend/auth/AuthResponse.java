package com.bijou.backend.auth;

import java.util.Optional;

public record AuthResponse(Optional<String> token){}
