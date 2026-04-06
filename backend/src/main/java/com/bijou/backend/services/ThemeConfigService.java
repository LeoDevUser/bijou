package com.bijou.backend.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.ThemeConfig;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.ThemeConfigRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ThemeConfigService {

    private static final Logger log = LoggerFactory.getLogger(ThemeConfigService.class);

    private final ThemeConfigRepository themeConfigRepository;

    private ThemeConfigView toView(ThemeConfig t) {
        return new ThemeConfigView(
            t.getNavbarBg(), t.getNavbarText(), t.getNavbarTextSelected(), t.getNavbarTextInactive(),
            t.getAnnouncementBg(), t.getAnnouncementText(),
            t.getSiteBg(), t.getSiteText(),
            t.getCardText(), t.getCardButtonBg(), t.getCardButtonText(),
            t.getNavbarSeparator(), t.getSiteTextMuted(), t.getSiteTextAccent(), t.getSiteSeparator()
        );
    }

    public ThemeConfigView get() {
        log.debug("Fetching theme config");
        return toView(themeConfigRepository.findById(1L)
            .orElseThrow(() -> {
                log.error("Theme config not found");
                return new AppException(HttpStatus.NOT_FOUND, "THEME_NOT_FOUND");
            }));
    }

    public ThemeConfigView update(ThemeConfigRequest req) {
        log.info("Updating theme config");
        ThemeConfig theme = themeConfigRepository.findById(1L)
            .orElseThrow(() -> {
                log.error("Theme config not found during update");
                return new AppException(HttpStatus.NOT_FOUND, "THEME_NOT_FOUND");
            });
        theme.setNavbarBg(req.navbarBg());
        theme.setNavbarText(req.navbarText());
        theme.setNavbarTextSelected(req.navbarTextSelected());
        theme.setNavbarTextInactive(req.navbarTextInactive());
        theme.setAnnouncementBg(req.announcementBg());
        theme.setAnnouncementText(req.announcementText());
        theme.setSiteBg(req.siteBg());
        theme.setSiteText(req.siteText());
        theme.setCardText(req.cardText());
        theme.setCardButtonBg(req.cardButtonBg());
        theme.setCardButtonText(req.cardButtonText());
        theme.setNavbarSeparator(req.navbarSeparator());
        theme.setSiteTextMuted(req.siteTextMuted());
        theme.setSiteTextAccent(req.siteTextAccent());
        theme.setSiteSeparator(req.siteSeparator());
        ThemeConfigView result = toView(themeConfigRepository.save(theme));
        log.info("Theme config updated successfully");
        return result;
    }
}
