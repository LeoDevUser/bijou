package com.bijou.backend.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.bijou.backend.services.AppSettingsService;
import com.bijou.backend.services.AppSettingsToggleRequest;
import com.bijou.backend.services.AppSettingsView;
import com.bijou.backend.services.BrevoEmailService;
import com.bijou.backend.services.BrevoQuotaView;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AppSettingsController {

    private final AppSettingsService appSettingsService;
    private final BrevoEmailService brevoEmailService;

    @Value("${ADMIN_PAGE}")
    private String adminPage;

    @GetMapping("/${ADMIN_PAGE}/settings")
    public ResponseEntity<AppSettingsView> get() {
        return ResponseEntity.ok(appSettingsService.get());
    }

    @PatchMapping("/${ADMIN_PAGE}/settings/relay")
    public ResponseEntity<AppSettingsView> toggleRelay(@RequestBody AppSettingsToggleRequest req) {
        return ResponseEntity.ok(appSettingsService.setRelayEnabled(req.enabled()));
    }

    @GetMapping("/${ADMIN_PAGE}/settings/brevo-quota")
    public ResponseEntity<BrevoQuotaView> getBrevoQuota() {
        BrevoQuotaView quota = brevoEmailService.fetchDailyQuota();
        return quota != null ? ResponseEntity.ok(quota) : ResponseEntity.status(502).build();
    }
}
