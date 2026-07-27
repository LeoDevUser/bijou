package com.bijou.backend.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.AppSettings;
import com.bijou.backend.repositories.AppSettingsRepository;
import com.stripe.Stripe;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Owns the test/live Stripe credential sets and, based on the persisted
 * {@link AppSettings#isStripeLiveMode()} flag, decides which set is active.
 *
 * The Stripe Java SDK keys off a single process-global {@code Stripe.apiKey}, so
 * switching modes means re-pointing that static — done here on startup and again
 * whenever the admin flips the toggle. The publishable key is served to the
 * storefront so its Stripe.js always matches the backend's mode.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StripeModeService {

    private final AppSettingsRepository appSettingsRepository;

    @Value("${stripe.secret.key.test:}")      private String secretTest;
    @Value("${stripe.secret.key.live:}")      private String secretLive;
    @Value("${stripe.publishable.key.test:}") private String publishableTest;
    @Value("${stripe.publishable.key.live:}") private String publishableLive;
    @Value("${stripe.webhook.secret.test:}")  private String webhookTest;
    @Value("${stripe.webhook.secret.live:}")  private String webhookLive;

    public boolean isLiveMode() {
        return appSettingsRepository.findById(1L).map(AppSettings::isStripeLiveMode).orElse(false);
    }

    /** Whether a live secret key is present, so switching to live mode is possible. */
    public boolean liveConfigured() {
        return secretLive != null && !secretLive.isBlank();
    }

    public String secretKey() {
        return isLiveMode() ? secretLive : secretTest;
    }

    public String publishableKey() {
        return isLiveMode() ? publishableLive : publishableTest;
    }

    /**
     * Webhook signing secrets to try when verifying an event, active mode first.
     * Both are attempted so an event that lands during/after a mode switch (or a
     * dashboard "send test webhook") still verifies. Blank secrets are skipped.
     */
    public List<String> webhookSecrets() {
        List<String> ordered = isLiveMode()
            ? List.of(nz(webhookLive), nz(webhookTest))
            : List.of(nz(webhookTest), nz(webhookLive));
        List<String> out = new ArrayList<>();
        for (String s : ordered) if (!s.isBlank() && !out.contains(s)) out.add(s);
        return out;
    }

    /** Point the global Stripe SDK key at the currently-selected mode's secret. */
    public void applyApiKey() {
        Stripe.apiKey = secretKey();
        log.info("Stripe SDK key applied — mode: {}", isLiveMode() ? "LIVE" : "TEST");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        applyApiKey();
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
