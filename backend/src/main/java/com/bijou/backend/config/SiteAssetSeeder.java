package com.bijou.backend.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.SiteAsset;
import com.bijou.backend.repositories.SiteAssetRepository;

import lombok.RequiredArgsConstructor;

@Component
@Order(4)
@RequiredArgsConstructor
public class SiteAssetSeeder implements ApplicationRunner {

    private final SiteAssetRepository siteAssetRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (siteAssetRepository.count() > 0) return;
        siteAssetRepository.saveAll(List.of(
            SiteAsset.builder().slot("hero").build(),
            SiteAsset.builder().slot("ring").build(),
            SiteAsset.builder().slot("necklace").build(),
            SiteAsset.builder().slot("earring").build(),
            SiteAsset.builder().slot("bracelet").build(),
            SiteAsset.builder().slot("editorial1").build(),
            SiteAsset.builder().slot("editorial2").build()
        ));
    }
}
