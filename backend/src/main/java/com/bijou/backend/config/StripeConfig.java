package com.bijou.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * The global {@code Stripe.apiKey} is set at runtime by
 * {@link com.bijou.backend.services.StripeModeService}, which selects the test or
 * live secret based on the persisted admin toggle. This config only enables the
 * async support the payment/email flows rely on.
 */
@Configuration
@EnableAsync
public class StripeConfig {
}
