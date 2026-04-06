package com.bijou.backend.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.ThemeConfig;
import com.bijou.backend.repositories.ThemeConfigRepository;

import lombok.RequiredArgsConstructor;

@Component
@Order(5)
@RequiredArgsConstructor
public class ThemeConfigSeeder implements ApplicationRunner {

    private final ThemeConfigRepository themeConfigRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (themeConfigRepository.count() > 0) return;
        themeConfigRepository.save(ThemeConfig.builder()
            .id(1L)
            .navbarBg("#FAFAF8")
            .navbarText("#1C1C1C")
            .navbarTextSelected("#C9A96E")
            .navbarTextInactive("#9C9C9C")
            .announcementBg("#1C1C1C")
            .announcementText("#FFFFFF")
            .siteBg("#FAFAF8")
            .siteText("#1C1C1C")
            .cardText("#1C1C1C")
            .cardButtonBg("#1C1C1C")
            .cardButtonText("#FFFFFF")
            .navbarSeparator("#E8E4DC")
            .siteTextMuted("#9C9C9C")
            .siteTextAccent("#C9A96E")
            .siteSeparator("#E8E4DC")
            .build());
    }
}
