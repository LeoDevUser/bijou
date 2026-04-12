package com.bijou.backend.config;

import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.Collection;
import com.bijou.backend.entities.CollectionSiteAsset;
import com.bijou.backend.entities.CollectionTheme;
import com.bijou.backend.entities.Label;
import com.bijou.backend.repositories.CollectionRepository;
import com.bijou.backend.repositories.CollectionSiteAssetRepository;
import com.bijou.backend.repositories.CollectionThemeRepository;
import com.bijou.backend.repositories.LabelRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Seeds three flagship collections: Esencial, Premium, and Inversión.
 *
 * Color palette applied to all three collection themes:
 *   Negro Élite  #0A0A0A — primary background / text
 *   Blanco Puro  #FFFFFF — catalog / card backgrounds
 *   Oro Viejo    #C5A059 — titles, main CTAs, accent
 *   Champagne    #E5D1B0 — subtitles, nav text, interaction details
 *   Gris Carbón  #2B2B2B — secondary text, dividers
 *   Humo Suave   #F5F5F5 — product card background (applied via card theme)
 */
@Component
@Order(6)
@RequiredArgsConstructor
public class CollectionSeeder implements ApplicationRunner {

    private static final String NEGRO  = "#0A0A0A";
    private static final String BLANCO = "#FFFFFF";
    private static final String ORO    = "#C5A059";
    private static final String CHAMP  = "#E5D1B0";
    private static final String CARBON = "#2B2B2B";

    private final CollectionRepository            collectionRepository;
    private final CollectionSiteAssetRepository   assetRepository;
    private final CollectionThemeRepository       themeRepository;
    private final LabelRepository                 labelRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Skip if any non-main collection already exists (default home collection seeded by DefaultCollectionSeeder doesn't count)
        if (collectionRepository.findAllByOrderByIdAsc().stream().anyMatch(c -> !c.isMain())) return;

        // ── Labels ────────────────────────────────────────────────────────────
        Label esencial  = label("Esencial",  "Essentiel",     "Esencial");
        Label premium   = label("Premium",   "Premium",       "Premium");
        Label inversion = label("Investment","Investissement", "Inversión");

        labelRepository.saveAll(List.of(esencial, premium, inversion));

        // ── Collections ───────────────────────────────────────────────────────
        Collection colEsencial  = buildCollection(
            List.of(esencial),
            "Esencial",      "Essentiel",       "Esencial",
            "The first step to accessible luxury",
            "Le premier pas vers le luxe accessible",
            "El primer paso al lujo accesible",
            CHAMP
        );
        Collection colPremium   = buildCollection(
            List.of(premium),
            "Premium",       "Premium",         "Premium",
            "The splendor of artisanal design",
            "La splendeur du design artisanal",
            "El esplendor del diseño artesanal",
            CHAMP
        );
        Collection colInversion = buildCollection(
            List.of(inversion),
            "Inversión",     "Investissement",  "Inversión",
            "Heritage in solid metal",
            "Patrimoine en métal solide",
            "Patrimonio en metal sólido",
            CHAMP
        );

        collectionRepository.saveAll(List.of(colEsencial, colPremium, colInversion));

        // ── Site assets ───────────────────────────────────────────────────────
        seedAssets(colEsencial,
            // hero
            "Essential Collection", "Collection Essentielle", "Colección Esencial",
            "The first step to accessible luxury",
            "Le premier pas vers le luxe accessible",
            "El primer paso al lujo accesible",
            // editorial 1
            ".925 Silver & Stainless Steel", "Argent .925 & Acier Inoxydable", "Plata .925 y Acero Inoxidable",
            "Minimalist design and superior durability for everyday wear",
            "Design minimaliste et durabilité supérieure pour le quotidien",
            "Diseño minimalista y durabilidad superior para el día a día",
            // editorial 2
            "Accessible Luxury", "Luxe Accessible", "Lujo Accesible",
            "Fundamental pieces that blend style with everyday practicality",
            "Pièces fondamentales qui allient style et praticité au quotidien",
            "Piezas fundamentales que combinan estilo y practicidad"
        );

        seedAssets(colPremium,
            // hero
            "Premium Collection", "Collection Premium", "Colección Premium",
            "The splendor of artisanal design",
            "La splendeur du design artisanal",
            "El esplendor del diseño artesanal",
            // editorial 1
            "10k & 14k Gold Craftsmanship", "Or 10k & 14k Artisanal", "Artesanía en Oro 10k y 14k",
            "Iconic pieces for unforgettable moments, crafted in pure gold",
            "Pièces iconiques pour des moments inoubliables, en or pur",
            "Piezas emblemáticas para momentos inolvidables. Calidad inigualable en Oro",
            // editorial 2
            "Unparalleled Design", "Design Inégalé", "Diseño Sin Igual",
            "Each piece is a testament to artisanal mastery and refined elegance",
            "Chaque pièce témoigne d'une maîtrise artisanale et d'une élégance raffinée",
            "Cada pieza es un testimonio de maestría artesanal y elegancia refinada"
        );

        seedAssets(colInversion,
            // hero
            "Investment Collection", "Collection Investissement", "Colección de Inversión",
            "Heritage in solid metal",
            "Patrimoine en métal solide",
            "Patrimonio en metal sólido",
            // editorial 1
            "18k & 24k Solid Gold", "Or Massif 18k & 24k", "Oro Sólido 18k y 24k",
            "Certified purity, high karat weight — a tangible store of value",
            "Pureté certifiée, haut gramme — une réserve de valeur tangible",
            "Pureza certificada y alto gramaje. Resguardo de capital y legado familiar",
            // editorial 2
            "Family Legacy", "Héritage Familial", "Legado Familiar",
            "Eternal pieces of value. Gold that appreciates and endures through generations",
            "Pièces de valeur éternelle. De l'or qui s'apprécie et dure à travers les générations",
            "Piezas de valor eterno. Oro puro de alto gramaje que trasciende generaciones"
        );

        // ── Themes ────────────────────────────────────────────────────────────
        // All three collections share the same luxury dark-gold palette
        for (Collection c : List.of(colEsencial, colPremium, colInversion)) {
            themeRepository.save(CollectionTheme.builder()
                .collection(c)
                .navbarBg(NEGRO)
                .navbarText(CHAMP)
                .navbarTextSelected(ORO)
                .navbarTextInactive(CARBON)
                .announcementBg(NEGRO)
                .announcementText(CHAMP)
                .siteBg(BLANCO)
                .siteText(NEGRO)
                .cardText(NEGRO)
                .cardButtonBg(ORO)
                .cardButtonText(NEGRO)
                .navbarSeparator(CARBON)
                .siteTextMuted(CARBON)
                .siteTextAccent(ORO)
                .siteSeparator(CARBON)
                .build());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Label label(String en, String fr, String es) {
        return Label.builder().nameEn(en).nameFr(fr).nameEs(es).build();
    }

    private Collection buildCollection(
            List<Label> labels,
            String headerEn, String headerFr, String headerEs,
            String subEn, String subFr, String subEs,
            String color) {
        Collection c = Collection.builder()
                .headerEn(headerEn).headerFr(headerFr).headerEs(headerEs)
                .subheaderEn(subEn).subheaderFr(subFr).subheaderEs(subEs)
                .color(color)
                .build();
        c.setLabels(labels);
        return c;
    }

    private void seedAssets(
            Collection c,
            String heroHeadEn, String heroHeadFr, String heroHeadEs,
            String heroSubEn,  String heroSubFr,  String heroSubEs,
            String ed1HeadEn,  String ed1HeadFr,  String ed1HeadEs,
            String ed1SubEn,   String ed1SubFr,   String ed1SubEs,
            String ed2HeadEn,  String ed2HeadFr,  String ed2HeadEs,
            String ed2SubEn,   String ed2SubFr,   String ed2SubEs) {

        assetRepository.saveAll(List.of(
            CollectionSiteAsset.builder()
                .collection(c).slot("hero")
                .headerEn(heroHeadEn).headerFr(heroHeadFr).headerEs(heroHeadEs)
                .subheaderEn(heroSubEn).subheaderFr(heroSubFr).subheaderEs(heroSubEs)
                .color(CHAMP)
                .build(),

            CollectionSiteAsset.builder()
                .collection(c).slot("editorial1")
                .headerEn(ed1HeadEn).headerFr(ed1HeadFr).headerEs(ed1HeadEs)
                .subheaderEn(ed1SubEn).subheaderFr(ed1SubFr).subheaderEs(ed1SubEs)
                .color(NEGRO)
                .build(),

            CollectionSiteAsset.builder()
                .collection(c).slot("editorial2")
                .headerEn(ed2HeadEn).headerFr(ed2HeadFr).headerEs(ed2HeadEs)
                .subheaderEn(ed2SubEn).subheaderFr(ed2SubFr).subheaderEs(ed2SubEs)
                .color(NEGRO)
                .build()
        ));
    }
}
