package com.bijou.backend.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bijou.backend.entities.Item;
import com.bijou.backend.entities.PricingFormula;
import com.bijou.backend.repositories.ItemRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Computes and persists metal-indexed prices:
 *
 *   price = ceil10( mxnPerGram × formula.factor × weightGrams + margin )
 *
 * Prices are written into Item.price (compute-and-persist), so checkout,
 * Stripe, views and stats all read the same number with no live dependency
 * on the metal-price feed. A daily job refreshes every dynamic item — that
 * IS the "price of the day"; if the feed is down, items simply keep their
 * last computed price.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicPricingService {

    private static final BigDecimal TEN = BigDecimal.TEN;

    private final MetalPriceService metalPriceService;
    private final ItemRepository itemRepository;

    /** Empty when the formula is NONE/null or no metal price has ever been fetched. */
    public Optional<BigDecimal> computePrice(PricingFormula formula, float weightGrams, BigDecimal margin) {
        if (formula == null || formula == PricingFormula.NONE) return Optional.empty();
        return metalPriceService.mxnPerGram(formula.metal()).map(perGram -> {
            BigDecimal base = perGram
                    .multiply(formula.factor())
                    .multiply(BigDecimal.valueOf(weightGrams))
                    .add(margin == null ? BigDecimal.ZERO : margin);
            // ceil to the next multiple of 10 MXN (e.g. 2311 -> 2320)
            return base.divide(TEN, 0, RoundingMode.CEILING).multiply(TEN);
        });
    }

    /** Recompute Item.price for every dynamically priced item. */
    @Scheduled(cron = "0 0 7 * * *", zone = "America/Mexico_City")
    @Transactional
    public void repriceAll() {
        List<Item> dynamicItems = itemRepository.findAll().stream()
                .filter(i -> i.getPricingFormula() != null && i.getPricingFormula() != PricingFormula.NONE)
                .toList();
        if (dynamicItems.isEmpty()) return;
        int updated = 0;
        for (Item item : dynamicItems) {
            Optional<BigDecimal> price = computePrice(item.getPricingFormula(), item.getWeightGrams(), item.getPricingMargin());
            if (price.isPresent() && price.get().compareTo(item.getPrice()) != 0) {
                item.setPrice(price.get());
                itemRepository.save(item);
                updated++;
            }
        }
        log.info("dynamic repricing: {} of {} items updated", updated, dynamicItems.size());
    }

    /** Reprice once on startup so a fresh deploy doesn't serve yesterday's prices until 7am. */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            repriceAll();
        } catch (Exception e) {
            log.warn("startup repricing failed: {}", e.getMessage());
        }
    }
}
