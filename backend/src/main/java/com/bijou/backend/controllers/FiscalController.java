package com.bijou.backend.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bijou.backend.entities.CfdiUso;
import com.bijou.backend.entities.RegimenFiscal;

/**
 * Public SAT catalog for the checkout factura form: the list of fiscal regimes
 * (each with its valid usos, per the SAT matrix) and the full uso de CFDI list.
 * Static reference data — lets the frontend build/validate the factura dropdowns
 * without duplicating the matrix.
 */
@RestController
public class FiscalController {

    public record UsoView(String code, String description) {}

    public record RegimenView(
        String name,
        String code,
        String description,
        boolean fisica,
        boolean moral,
        List<String> usos
    ) {}

    public record FiscalCatalog(List<RegimenView> regimenes, List<UsoView> usos) {}

    @GetMapping("/public/fiscal/catalog")
    public ResponseEntity<FiscalCatalog> catalog() {
        List<RegimenView> regimenes = java.util.Arrays.stream(RegimenFiscal.values())
            .map(r -> new RegimenView(
                r.name(),
                r.getCode(),
                r.getDescription(),
                r.isFisica(),
                r.isMoral(),
                r.getAllowedUsos().stream().map(CfdiUso::name).sorted().toList()))
            .toList();
        List<UsoView> usos = java.util.Arrays.stream(CfdiUso.values())
            .map(u -> new UsoView(u.name(), u.getDescription()))
            .toList();
        return ResponseEntity.ok(new FiscalCatalog(regimenes, usos));
    }
}
