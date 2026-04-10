package com.bijou.backend.config;

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
            .build());
    }
}
