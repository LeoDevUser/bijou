package com.bijou.backend.controllers;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bijou.backend.entities.PricingFormula.MetalKind;
import com.bijou.backend.services.MetalPriceService;

import lombok.RequiredArgsConstructor;

/**
 * Daily metal spot prices in MXN per gram (pure metal), for the admin panel's
 * dynamic-pricing preview. Values may be null if the feed has never responded.
 */
@RestController
@RequiredArgsConstructor
public class MetalPricesController {

    private final MetalPriceService metalPriceService;

    @GetMapping("/public/metal-prices")
    public ResponseEntity<Map<String, BigDecimal>> getPrices() {
        Map<String, BigDecimal> out = new HashMap<>();
        out.put("goldMxnPerGram", metalPriceService.mxnPerGram(MetalKind.GOLD).orElse(null));
        out.put("silverMxnPerGram", metalPriceService.mxnPerGram(MetalKind.SILVER).orElse(null));
        return ResponseEntity.ok(out);
    }
}
