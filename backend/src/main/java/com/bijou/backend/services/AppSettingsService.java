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
            s.isSmtpRelayEnabled(), s.getDisabledReason(), s.isMsiEnabled(),
            s.getStandardShippingFee(), s.getExtendedShippingFee(), s.getFreeShippingThreshold());
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

    @Transactional
    public AppSettingsView setMsiEnabled(boolean enabled) {
        AppSettings s = load();
        s.setMsiEnabled(enabled);
        log.info("MSI installments {}", enabled ? "enabled" : "disabled");
        return toView(repository.save(s));
    }

    @Transactional(readOnly = true)
    public boolean isMsiEnabled() {
        return load().isMsiEnabled();
    }

    @Transactional(readOnly = true)
    public AppSettings shippingConfig() {
        return load();
    }

    @Transactional
    public AppSettingsView updateShippingConfig(ShippingConfigRequest req) {
        if (req.standardShippingFee() == null || req.extendedShippingFee() == null
                || req.freeShippingThreshold() == null
                || req.standardShippingFee().signum() < 0
                || req.extendedShippingFee().signum() < 0
                || req.freeShippingThreshold().signum() < 0) {
            throw new AppException(HttpStatus.BAD_REQUEST, "SHIPPING_CONFIG_INVALID");
        }
        AppSettings s = load();
        s.setStandardShippingFee(req.standardShippingFee());
        s.setExtendedShippingFee(req.extendedShippingFee());
        s.setFreeShippingThreshold(req.freeShippingThreshold());
        log.info("shipping config updated — standard: {}, extended: {}, free over: {}",
            req.standardShippingFee(), req.extendedShippingFee(), req.freeShippingThreshold());
        return toView(repository.save(s));
    }

    /** Called when Brevo returns a 429. Auto-disables the relay via a single atomic UPDATE. */
    @Transactional
    public void autoDisable(String reason) {
        repository.autoDisable(reason);
        log.warn("SMTP relay auto-disabled: {}", reason);
    }
}
