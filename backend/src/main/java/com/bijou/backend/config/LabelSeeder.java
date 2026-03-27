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
        for (String name : List.of("Gold", "Silver", "New")) {
            if (!labelRepository.existsByNameIgnoreCase(name)) {
                labelRepository.save(Label.builder().name(name).build());
            }
        }
    }
}
