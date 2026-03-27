package com.bijou.backend.services;

import com.bijou.backend.entities.Client;

public record PaymentSuccessEvent(Client client, Long orderId) {}
