package com.bijou.backend.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.Collection;
import com.bijou.backend.entities.CollectionSiteAsset;
import com.bijou.backend.entities.CollectionTheme;
import com.bijou.backend.repositories.CollectionRepository;
import com.bijou.backend.repositories.CollectionSiteAssetRepository;
import com.bijou.backend.repositories.CollectionThemeRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Seeds the default "home" collection.
 *
 * This collection is active=false (hidden from the collections tab) and isMain=true.
 * Its theme carries the site default colors so the admin can edit it from the Theme tab.
 * Guard: skipped if any main collection already exists.
 */
@Component
@Order(5)
@RequiredArgsConstructor
public class DefaultCollectionSeeder implements ApplicationRunner {

    private final CollectionRepository          collectionRepository;
    private final CollectionSiteAssetRepository assetRepository;
    private final CollectionThemeRepository     themeRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (collectionRepository.findByIsMainTrue().isPresent()) return;

        Collection defaultCollection = Collection.builder()
                .headerEn("Bijou Monde")
                .headerFr("Bijou Monde")
                .headerEs("Bijou Monde")
                .subheaderEn("Fine jewellery for every moment")
                .subheaderFr("Bijoux fins pour chaque moment")
                .subheaderEs("Joyería fina para cada momento")
                .cardTextColor("#1C1C1C")
                .active(false)
                .isMain(true)
                .build();

        collectionRepository.save(defaultCollection);

        // Empty site-asset slots
        assetRepository.saveAll(List.of(
            CollectionSiteAsset.builder().collection(defaultCollection).slot("hero").build(),
            CollectionSiteAsset.builder().collection(defaultCollection).slot("editorial1").build(),
            CollectionSiteAsset.builder().collection(defaultCollection).slot("editorial2").build(),
            CollectionSiteAsset.builder().collection(defaultCollection).slot("editorial3").build(),
            CollectionSiteAsset.builder().collection(defaultCollection).slot("editorial4").build()
        ));

        // Seed theme with the site default color values
        themeRepository.save(CollectionTheme.builder()
                .collection(defaultCollection)
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
