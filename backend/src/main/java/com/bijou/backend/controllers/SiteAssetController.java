package com.bijou.backend.controllers;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.bijou.backend.services.SiteAssetService;
import com.bijou.backend.services.SiteAssetTextRequest;
import com.bijou.backend.services.SiteAssetView;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class SiteAssetController {

    private final SiteAssetService siteAssetService;

    @GetMapping("/public/site-assets")
    public ResponseEntity<List<SiteAssetView>> getAll() {
        return ResponseEntity.ok(siteAssetService.getAll());
    }

    @PatchMapping("/${ADMIN_PAGE}/site-assets/{slot}")
    public ResponseEntity<SiteAssetView> updateText(
            @PathVariable String slot,
            @RequestBody SiteAssetTextRequest req) {
        return ResponseEntity.ok(siteAssetService.updateText(slot, req));
    }

    @PatchMapping(value = "/${ADMIN_PAGE}/site-assets/{slot}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SiteAssetView> uploadImage(
            @PathVariable String slot,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(siteAssetService.uploadMedia(slot, file));
    }

    @DeleteMapping("/${ADMIN_PAGE}/site-assets/{slot}/image")
    public ResponseEntity<SiteAssetView> deleteImage(@PathVariable String slot) {
        return ResponseEntity.ok(siteAssetService.deleteMedia(slot));
    }
}
