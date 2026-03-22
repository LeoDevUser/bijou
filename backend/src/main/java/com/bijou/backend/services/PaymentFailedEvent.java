package com.bijou.backend.services;

import com.bijou.backend.entities.Client;

public record PaymentFailedEvent(Client client, Long orderId) {}
