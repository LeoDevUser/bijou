package com.bijou.backend.controllers;

import com.bijou.backend.services.OrderView;

public record OrderCreateResponse (
        OrderView order,
        String clientSecret
) {}
