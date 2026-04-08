package com.bijou.backend.controllers;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.bijou.backend.exception.AppException;

import lombok.extern.slf4j.Slf4j;

@RestController
@Slf4j
public class FxRatesController {

    private static final String FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=MXN&to=USD,CAD";
    private static final Map<String, Double> FALLBACK = Map.of("MXN", 1.0, "USD", 0.05, "CAD", 0.07);

    @GetMapping("/public/fx-rates")
    public ResponseEntity<Map<String, Double>> getRates() {
        try {
            RestTemplate rest = new RestTemplate();
            @SuppressWarnings("unchecked")
            Map<String, Object> body = rest.getForObject(FRANKFURTER_URL, Map.class);
            if (body == null || !body.containsKey("rates")) {
                return ResponseEntity.ok(FALLBACK);
            }
            @SuppressWarnings("unchecked")
            Map<String, Double> rates = (Map<String, Double>) body.get("rates");
            rates.put("MXN", 1.0);
            return ResponseEntity.ok(rates);
        } catch (Exception e) {
            log.warn("failed to fetch fx rates from frankfurter, using fallback: {}", e.getMessage());
            return ResponseEntity.ok(FALLBACK);
        }
    }
}
