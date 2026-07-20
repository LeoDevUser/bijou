package com.bijou.backend.services;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.bijou.backend.entities.PricingFormula.MetalKind;

import lombok.extern.slf4j.Slf4j;

/**
 * Daily metal spot prices in MXN per gram.
 *
 * Source: Kitco's public GraphQL gateway (the endpoint behind kitco.com's own
 * price pages — the successor to the retired KitcoCharts API that older
 * libraries scraped). Quotes come back as USD per troy ounce; converted to
 * MXN per gram with the USD→MXN rate from Frankfurter (the same provider the
 * storefront's /public/fx-rates uses).
 *
 * Results are cached for an hour, and the last good value is kept
 * indefinitely as a fallback so a Kitco or FX outage never leaves us
 * priceless — callers get slightly stale data instead of an error.
 */
@Service
@Slf4j
public class MetalPriceService {

    private static final String KITCO_URL = "https://kdb-gw.prod.kitco.com/";
    private static final String FX_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN";
    private static final BigDecimal GRAMS_PER_TROY_OUNCE = new BigDecimal("31.1034768");
    private static final Duration TTL = Duration.ofHours(1);

    private record Cached(BigDecimal mxnPerGram, Instant fetchedAt) {}

    private final RestTemplate rest = new RestTemplate();
    private final Map<MetalKind, Cached> cache = new ConcurrentHashMap<>();

    /** MXN per gram of the pure metal; empty only if it has never been fetched successfully. */
    public Optional<BigDecimal> mxnPerGram(MetalKind metal) {
        Cached hit = cache.get(metal);
        if (hit != null && hit.fetchedAt().isAfter(Instant.now().minus(TTL))) {
            return Optional.of(hit.mxnPerGram());
        }
        try {
            BigDecimal usdPerOunce = fetchKitcoBid(metal == MetalKind.GOLD ? "AU" : "AG");
            BigDecimal usdMxn = fetchUsdMxn();
            BigDecimal perGram = usdPerOunce
                    .divide(GRAMS_PER_TROY_OUNCE, MathContext.DECIMAL64)
                    .multiply(usdMxn);
            cache.put(metal, new Cached(perGram, Instant.now()));
            log.info("{} spot: {} USD/oz × {} USD/MXN = {} MXN/g", metal, usdPerOunce, usdMxn, perGram);
            return Optional.of(perGram);
        } catch (Exception e) {
            log.warn("metal price fetch failed for {} ({}), {}", metal, e.getMessage(),
                    hit != null ? "using last good value" : "no cached value available");
            return Optional.ofNullable(hit).map(Cached::mxnPerGram);
        }
    }

    private BigDecimal fetchKitcoBid(String symbol) {
        String query = String.format(
            "{\"query\":\"{GetMetalQuote(symbol:\\\"%s\\\",currency:\\\"USD\\\"){results{bid}}}\"}", symbol);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<?, ?> body = rest.postForObject(KITCO_URL, new HttpEntity<>(query, headers), Map.class);
        Object data = body == null ? null : body.get("data");
        Object quote = data instanceof Map<?, ?> d ? d.get("GetMetalQuote") : null;
        Object results = quote instanceof Map<?, ?> q ? q.get("results") : null;
        Object first = results instanceof List<?> l && !l.isEmpty() ? l.get(0) : null;
        Object bid = first instanceof Map<?, ?> f ? f.get("bid") : null;
        if (!(bid instanceof Number n) || n.doubleValue() <= 0) {
            throw new IllegalStateException("kitco returned no bid for " + symbol);
        }
        return BigDecimal.valueOf(n.doubleValue());
    }

    private BigDecimal fetchUsdMxn() {
        Map<?, ?> body = rest.getForObject(FX_URL, Map.class);
        Object rates = body == null ? null : body.get("rates");
        Object mxn = rates instanceof Map<?, ?> r ? r.get("MXN") : null;
        if (!(mxn instanceof Number n) || n.doubleValue() <= 0) {
            throw new IllegalStateException("frankfurter returned no MXN rate");
        }
        return BigDecimal.valueOf(n.doubleValue());
    }
}
