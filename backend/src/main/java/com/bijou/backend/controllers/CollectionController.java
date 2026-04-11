package com.bijou.backend.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.bijou.backend.services.CollectionAssetRequest;
import com.bijou.backend.services.CollectionRequest;
import com.bijou.backend.services.CollectionService;
import com.bijou.backend.services.CollectionSiteAssetView;
import com.bijou.backend.services.CollectionThemeRequest;
import com.bijou.backend.services.CollectionThemeView;
import com.bijou.backend.services.CollectionView;
import com.bijou.backend.services.ItemView;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class CollectionController {

    private final CollectionService collectionService;

    // ── Public ───────────────────────────────────────────────────────────────────

    @GetMapping("/public/collections")
    public ResponseEntity<List<CollectionView>> getAll() {
        return ResponseEntity.ok(collectionService.getAll());
    }

    @GetMapping("/public/collections/{id}")
    public ResponseEntity<CollectionView> getById(@PathVariable Long id) {
        return ResponseEntity.ok(collectionService.getById(id));
    }

    @GetMapping("/public/collections/{id}/items")
    public ResponseEntity<List<ItemView>> getItems(@PathVariable Long id) {
        return ResponseEntity.ok(collectionService.getItemsByCollection(id));
    }

    @GetMapping("/public/collections/{id}/items/trending")
    public ResponseEntity<List<ItemView>> getTrendingItems(@PathVariable Long id) {
        return ResponseEntity.ok(collectionService.getTrendingByCollection(id));
    }

    // ── Admin ────────────────────────────────────────────────────────────────────

    @PostMapping("/${ADMIN_PAGE}/collections")
    public ResponseEntity<CollectionView> create(@RequestBody CollectionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(collectionService.create(req));
    }

    @PatchMapping("/${ADMIN_PAGE}/collections/{id}")
    public ResponseEntity<CollectionView> updateText(
            @PathVariable Long id,
            @RequestBody CollectionRequest req) {
        return ResponseEntity.ok(collectionService.updateText(id, req));
    }

    @PatchMapping(value = "/${ADMIN_PAGE}/collections/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CollectionView> uploadImage(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(collectionService.uploadMedia(id, file));
    }

    @DeleteMapping("/${ADMIN_PAGE}/collections/{id}/image")
    public ResponseEntity<CollectionView> deleteImage(@PathVariable Long id) {
        return ResponseEntity.ok(collectionService.deleteMedia(id));
    }

    @DeleteMapping("/${ADMIN_PAGE}/collections/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        collectionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Admin: per-collection site assets ────────────────────────────────────────

    @PatchMapping("/${ADMIN_PAGE}/collections/{id}/assets/{slot}")
    public ResponseEntity<CollectionSiteAssetView> updateAsset(
            @PathVariable Long id,
            @PathVariable String slot,
            @RequestBody CollectionAssetRequest req) {
        return ResponseEntity.ok(collectionService.updateAssetText(id, slot, req));
    }

    @PatchMapping(value = "/${ADMIN_PAGE}/collections/{id}/assets/{slot}/image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CollectionSiteAssetView> uploadAssetImage(
            @PathVariable Long id,
            @PathVariable String slot,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(collectionService.uploadAssetMedia(id, slot, file));
    }

    @DeleteMapping("/${ADMIN_PAGE}/collections/{id}/assets/{slot}/image")
    public ResponseEntity<CollectionSiteAssetView> deleteAssetImage(
            @PathVariable Long id,
            @PathVariable String slot) {
        return ResponseEntity.ok(collectionService.deleteAssetMedia(id, slot));
    }

    // ── Admin: per-collection theme ───────────────────────────────────────────────

    @PatchMapping("/${ADMIN_PAGE}/collections/{id}/theme")
    public ResponseEntity<CollectionThemeView> updateTheme(
            @PathVariable Long id,
            @RequestBody CollectionThemeRequest req) {
        return ResponseEntity.ok(collectionService.updateTheme(id, req));
    }

    @DeleteMapping("/${ADMIN_PAGE}/collections/{id}/theme")
    public ResponseEntity<Void> deleteTheme(@PathVariable Long id) {
        collectionService.deleteTheme(id);
        return ResponseEntity.noContent().build();
    }
}
