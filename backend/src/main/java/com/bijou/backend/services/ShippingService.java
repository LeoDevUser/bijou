package com.bijou.backend.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.bijou.backend.entities.AppSettings;
import com.bijou.backend.entities.Country;

import lombok.RequiredArgsConstructor;

/**
 * Domestic (Mexico-only) shipping fee.
 *
 * Two flat zones based on destination state, plus free shipping above a
 * configurable item-subtotal threshold. All three amounts (MXN) live in
 * AppSettings and are editable from the admin panel — tune them as real
 * label costs come in from the carrier/aggregator.
 *
 * Extended zone: states where small-package labels consistently price above
 * the national average (peninsulas and the remote south/southeast).
 */
@Service
@RequiredArgsConstructor
public class ShippingService {

    /** Must match the state strings used by the frontend (data/addressOptions.ts). */
    private static final Set<String> EXTENDED_ZONE_STATES = Set.of(
        "Baja California",
        "Baja California Sur",
        "Sonora",
        "Chihuahua",
        "Chiapas",
        "Guerrero",
        "Oaxaca",
        "Quintana Roo",
        "Yucatán"
    );

    private final AppSettingsService appSettingsService;

    /**
     * @param country  destination country — non-Mexico destinations return 0
     *                 (cross-border orders are out of scope for now)
     * @param state    destination state as submitted at checkout; unknown or
     *                 missing states fall back to the standard-zone fee
     * @param subtotal item subtotal in MXN (pre-tax)
     * @return shipping fee in MXN, 0 when the free-shipping threshold is met
     */
    public BigDecimal fee(Country country, String state, BigDecimal subtotal) {
        if (country != Country.MEXICO) return BigDecimal.ZERO;

        AppSettings cfg = appSettingsService.shippingConfig();
        if (subtotal.compareTo(cfg.getFreeShippingThreshold()) >= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal fee = state != null && EXTENDED_ZONE_STATES.contains(state.trim())
            ? cfg.getExtendedShippingFee()
            : cfg.getStandardShippingFee();
        return fee.setScale(2, RoundingMode.HALF_UP);
    }
}
