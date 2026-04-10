package com.bijou.backend.services;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bijou.backend.entities.AppSettings;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.AppSettingsRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppSettingsService {

    private final AppSettingsRepository repository;

    private AppSettings load() {
        return repository.findById(1L)
            .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "APP_SETTINGS_NOT_FOUND"));
    }

    private AppSettingsView toView(AppSettings s) {
        return new AppSettingsView(
            s.isSmtpRelayEnabled(),
            s.getEmailsSentThisMonth(),
            s.getRateLimitRemaining(),
            s.getRateLimitReset(),
            s.getDisabledReason()
        );
    }

    @Transactional(readOnly = true)
    public AppSettingsView get() {
        return toView(load());
    }

    @Transactional(readOnly = true)
    public boolean isRelayEnabled() {
        return load().isSmtpRelayEnabled();
    }

    @Transactional
    public AppSettingsView setRelayEnabled(boolean enabled) {
        AppSettings s = load();
        s.setSmtpRelayEnabled(enabled);
        if (enabled) {
            s.setDisabledReason(null);
            log.info("SMTP relay manually enabled");
        } else {
            log.info("SMTP relay manually disabled");
        }
        return toView(repository.save(s));
    }

    /** Called after a successful Brevo API send. Increments the counter and auto-disables if limits are hit. */
    @Transactional
    public synchronized void recordSent(int remaining, long resetEpoch) {
        AppSettings s = load();
        int newCount = s.getEmailsSentThisMonth() + 1;
        s.setEmailsSentThisMonth(newCount);
        s.setRateLimitRemaining(remaining);
        s.setRateLimitReset(resetEpoch);

        if (remaining == 0) {
            s.setSmtpRelayEnabled(false);
            s.setDisabledReason("RATE_LIMIT_EXHAUSTED");
            log.warn("SMTP relay auto-disabled: Brevo rate limit exhausted (resets at epoch {})", resetEpoch);
        } else if (newCount >= 300) {
            s.setSmtpRelayEnabled(false);
            s.setDisabledReason("MONTHLY_LIMIT_REACHED");
            log.warn("SMTP relay auto-disabled: 300-email monthly safety cap reached");
        }

        repository.save(s);
    }

    /** Called when Brevo returns a 429. Auto-disables the relay. */
    @Transactional
    public synchronized void autoDisable(String reason, int remaining, long resetEpoch) {
        AppSettings s = load();
        s.setSmtpRelayEnabled(false);
        s.setDisabledReason(reason);
        if (remaining >= 0) s.setRateLimitRemaining(remaining);
        if (resetEpoch > 0) s.setRateLimitReset(resetEpoch);
        repository.save(s);
        log.warn("SMTP relay auto-disabled: {}", reason);
    }

    /** Called by the monthly scheduler on the 1st of each month. Resets the counter but does NOT re-enable the relay. */
    @Transactional
    public void resetMonthlyCounter() {
        AppSettings s = load();
        s.setEmailsSentThisMonth(0);
        repository.save(s);
        log.info("monthly email counter reset to 0");
    }
}
