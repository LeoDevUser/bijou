package com.bijou.backend.config;

import java.math.BigDecimal;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.AppSettings;
import com.bijou.backend.repositories.AppSettingsRepository;

import lombok.RequiredArgsConstructor;

@Component
@Order(6)
@RequiredArgsConstructor
public class AppSettingsSeeder implements ApplicationRunner {

    private final AppSettingsRepository appSettingsRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (appSettingsRepository.count() > 0) return;
        appSettingsRepository.save(AppSettings.builder()
            .id(1L)
            .smtpRelayEnabled(true)
            .msiEnabled(false)
            .standardShippingFee(new BigDecimal("149"))
            .extendedShippingFee(new BigDecimal("219"))
            .freeShippingThreshold(new BigDecimal("2000"))
            .build());
    }
}
