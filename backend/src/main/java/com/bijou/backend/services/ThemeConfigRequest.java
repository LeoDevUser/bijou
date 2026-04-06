package com.bijou.backend.services;

public record ThemeConfigRequest(
    String navbarBg,
    String navbarText,
    String navbarTextSelected,
    String navbarTextInactive,
    String announcementBg,
    String announcementText,
    String siteBg,
    String siteText,
    String cardText,
    String cardButtonBg,
    String cardButtonText,
    String navbarSeparator,
    String siteTextMuted,
    String siteTextAccent,
    String siteSeparator
) {}
