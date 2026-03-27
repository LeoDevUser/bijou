package com.bijou.backend.controllers;

import com.bijou.backend.entities.Status;

public record StatusChangeRequest(
        Long id,
        Status status
) {}
