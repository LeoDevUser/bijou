package com.bijou.backend.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.Announcement;
import com.bijou.backend.repositories.AnnouncementRepository;

import lombok.RequiredArgsConstructor;

@Component
@Order(3)
@RequiredArgsConstructor
public class AnnouncementSeeder implements ApplicationRunner {

    private final AnnouncementRepository announcementRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (announcementRepository.count() > 0) return;
        announcementRepository.saveAll(List.of(
            Announcement.builder()
                .textEn("Complimentary shipping on orders over $150")
                .textFr("Livraison offerte pour les commandes de plus de 150 $")
                .textEs("Envío gratuito en pedidos superiores a $150")
                .active(true).sortOrder(0).build(),
            Announcement.builder()
                .textEn("New collection just arrived")
                .textFr("Nouvelle collection disponible")
                .textEs("Nueva colección disponible")
                .active(true).sortOrder(1).build(),
            Announcement.builder()
                .textEn("Free returns within 30 days")
                .textFr("Retours gratuits sous 30 jours")
                .textEs("Devoluciones gratuitas en 30 días")
                .active(true).sortOrder(2).build()
        ));
    }
}
