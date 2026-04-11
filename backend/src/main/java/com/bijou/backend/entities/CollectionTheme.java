package com.bijou.backend.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "collection_themes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionTheme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_id", nullable = false, unique = true)
    private Collection collection;

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
