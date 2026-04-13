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
        return new AppSettingsView(s.isSmtpRelayEnabled(), s.getDisabledReason());
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

    /** Called when Brevo returns a 429. Auto-disables the relay via a single atomic UPDATE. */
    @Transactional
    public void autoDisable(String reason) {
        repository.autoDisable(reason);
        log.warn("SMTP relay auto-disabled: {}", reason);
    }
}
