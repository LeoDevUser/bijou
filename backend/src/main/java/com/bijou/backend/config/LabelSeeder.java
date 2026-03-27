package com.bijou.backend.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.Label;
import com.bijou.backend.repositories.LabelRepository;

import lombok.RequiredArgsConstructor;

@Component
@Order(2)
@RequiredArgsConstructor
public class LabelSeeder implements ApplicationRunner {

    private final LabelRepository labelRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (labelRepository.count() > 0) return;
        labelRepository.saveAll(List.of(
            Label.builder().nameEn("Gold").nameFr("Or").nameEs("Oro").build(),
            Label.builder().nameEn("Silver").nameFr("Argent").nameEs("Plata").build(),
            Label.builder().nameEn("New").nameFr("Nouveau").nameEs("Nuevo").build()
        ));
    }
}
