package com.bijou.backend.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.Category;
import com.bijou.backend.repositories.CategoryRepository;

import lombok.RequiredArgsConstructor;

@Component
@Order(3)
@RequiredArgsConstructor
public class CategorySeeder implements ApplicationRunner {

    private final CategoryRepository categoryRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (categoryRepository.count() > 0) return;
        categoryRepository.saveAll(List.of(
            Category.builder().nameEn("Chains").nameFr("Chaînes").nameEs("Cadenas").build(),
            Category.builder().nameEn("Bracelets").nameFr("Bracelets").nameEs("Pulsos").build(),
            Category.builder().nameEn("Slave Bracelets").nameFr("Bracelets esclaves").nameEs("Esclavas").build(),
            Category.builder().nameEn("Bangles").nameFr("Joncs").nameEs("Brazaletes").build(),
            Category.builder().nameEn("Charms").nameFr("Breloques").nameEs("Dijes").build(),
            Category.builder().nameEn("Chokers").nameFr("Ras-de-cou").nameEs("Gargantillas").build(),
            Category.builder().nameEn("Earrings").nameFr("Boucles d'oreilles").nameEs("Aretes").build(),
            Category.builder().nameEn("Huggie Earrings").nameFr("Créoles huggies").nameEs("Huggies").build(),
            Category.builder().nameEn("Stud Earrings").nameFr("Puces d'oreilles").nameEs("Broquel").build(),
            Category.builder().nameEn("Hoop Earrings").nameFr("Créoles").nameEs("Arracadas").build(),
            Category.builder().nameEn("Rings").nameFr("Bagues").nameEs("Anillos").build(),
            Category.builder().nameEn("Solitaires").nameFr("Solitaires").nameEs("Solitarios").build(),
            Category.builder().nameEn("Bands").nameFr("Alliances").nameEs("Argollas").build(),
            Category.builder().nameEn("Rosaries").nameFr("Chapelets").nameEs("Rosarios").build(),
            Category.builder().nameEn("Sets").nameFr("Parures").nameEs("Juegos").build(),
            Category.builder().nameEn("Keychains").nameFr("Porte-clés").nameEs("Llaveros").build(),
            Category.builder().nameEn("Money Clip").nameFr("Pince à billets").nameEs("Money Clip").build(),
            Category.builder().nameEn("Cufflinks").nameFr("Boutons de manchette").nameEs("Mancuernillas").build(),
            Category.builder().nameEn("Tie Clips").nameFr("Pinces à cravate").nameEs("Pizacorbatas").build(),
            Category.builder().nameEn("Watches").nameFr("Montres").nameEs("Reloj").build(),
            Category.builder().nameEn("Accessories").nameFr("Accessoires").nameEs("Complementos").build(),
            Category.builder().nameEn("Fresh Skincare").nameFr("Soins frais").nameEs("Productos skincare frescos").build()
        ));
    }
}
