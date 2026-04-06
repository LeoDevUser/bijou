package com.bijou.backend.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "theme_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThemeConfig {

    @Id
    private Long id;

    private String navbarBg;
    private String navbarText;
    private String navbarTextSelected;
    private String navbarTextInactive;
    private String announcementBg;
    private String announcementText;
    private String siteBg;
    private String siteText;
    private String cardText;
    private String cardButtonBg;
    private String cardButtonText;
    private String navbarSeparator;
    private String siteTextMuted;
    private String siteTextAccent;
    private String siteSeparator;
}
