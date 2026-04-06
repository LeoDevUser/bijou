package com.bijou.backend.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.bijou.backend.services.ThemeConfigRequest;
import com.bijou.backend.services.ThemeConfigService;
import com.bijou.backend.services.ThemeConfigView;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ThemeConfigController {

    private final ThemeConfigService themeConfigService;

    @GetMapping("/public/theme")
    public ResponseEntity<ThemeConfigView> get() {
        return ResponseEntity.ok(themeConfigService.get());
    }

    @PatchMapping("/${ADMIN_PAGE}/theme")
    public ResponseEntity<ThemeConfigView> update(@RequestBody ThemeConfigRequest req) {
        return ResponseEntity.ok(themeConfigService.update(req));
    }
}
