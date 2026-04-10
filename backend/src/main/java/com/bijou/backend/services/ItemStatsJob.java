package com.bijou.backend.services;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.bijou.backend.repositories.ItemRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class ItemStatsJob {
    private final ItemRepository itemRepository;
    private final AppSettingsService appSettingsService;

    // Every Sunday at Midnight (0 0 0 * * SUN)
    @Scheduled(cron = "0 0 0 * * SUN")
    @Transactional
    public void resetWeeklyStats() {
        itemRepository.resetSalesWeek();
        log.info("weekly sales reset done");
    }

    // 1st of every Month at Midnight
    @Scheduled(cron = "0 0 0 1 * *")
    @Transactional
    public void resetMonthlyStats() {
        itemRepository.resetNbSoldMonth();
        itemRepository.resetSalesMonth();
        appSettingsService.resetMonthlyCounter();
        log.info("monthly sales reset done");
    }

    // 1st day of every Quarter (Jan, Apr, Jul, Oct) at Midnight
    @Scheduled(cron = "0 0 0 1 1,4,7,10 *")
    @Transactional
    public void resetQuarterlyStats() {
        itemRepository.resetSalesQuarter();
        log.info("quarterly sales reset done");
    }

    // Jan 1st every Year at Midnight
    @Scheduled(cron = "0 0 0 1 1 *")
    @Transactional
    public void resetYearlyStats() {
        itemRepository.resetSalesYear();
        log.info("yearly sales reset done");
    }
}
