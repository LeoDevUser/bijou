package com.bijou.backend.controllers;

import java.util.List;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.bijou.backend.services.CollectionAssetRequest;
import com.bijou.backend.services.CollectionItemOrderRequest;
import com.bijou.backend.services.CollectionRequest;
import com.bijou.backend.services.CollectionService;
import com.bijou.backend.services.CollectionSiteAssetView;
import com.bijou.backend.services.CollectionThemeRequest;
import com.bijou.backend.services.CollectionThemeView;
import com.bijou.backend.services.CollectionView;
import com.bijou.backend.services.ItemView;
import com.bijou.backend.services.PickMediaRequest;

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

    @GetMapping("/public/collections/main")
    public ResponseEntity<CollectionView> getMain() {
        return collectionService.getMain()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
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

    @GetMapping("/${ADMIN_PAGE}/collections")
    public ResponseEntity<List<CollectionView>> getAllAdmin() {
        return ResponseEntity.ok(collectionService.getAllForAdmin());
    }

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
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name) {
        return ResponseEntity.ok(collectionService.uploadMedia(id, file, name));
    }

    @DeleteMapping("/${ADMIN_PAGE}/collections/{id}/image")
    public ResponseEntity<CollectionView> deleteImage(@PathVariable Long id) {
        return ResponseEntity.ok(collectionService.deleteMedia(id));
    }

    @PatchMapping("/${ADMIN_PAGE}/collections/{id}/main")
    public ResponseEntity<CollectionView> setMain(@PathVariable Long id) {
        return ResponseEntity.ok(collectionService.setMain(id));
    }

    @PatchMapping("/${ADMIN_PAGE}/collections/{id}/active")
    public ResponseEntity<CollectionView> setActive(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(collectionService.setActive(id, Boolean.TRUE.equals(body.get("active"))));
    }

    /**
     * Arranges this collection's items. Membership still follows the collection's labels
     * and categories — this only fixes where the named items sit; anything unlisted keeps
     * following on behind them.
     */
    @PatchMapping("/${ADMIN_PAGE}/collections/{id}/item-order")
    public ResponseEntity<CollectionView> updateItemOrder(
            @PathVariable Long id,
            @RequestBody CollectionItemOrderRequest req) {
        return ResponseEntity.ok(collectionService.updateItemOrder(id, req.itemIds()));
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

    /**
     * Each slot carries desktop media and, optionally, its own mobile media: {@code variant}
     * says which one the call is for, and anything but "mobile" means the desktop one — so
     * a caller that never heard of the split keeps editing the desktop media as before.
     */
    @PatchMapping(value = "/${ADMIN_PAGE}/collections/{id}/assets/{slot}/image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CollectionSiteAssetView> uploadAssetImage(
            @PathVariable Long id,
            @PathVariable String slot,
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "variant", required = false) String variant) {
        return ResponseEntity.ok(collectionService.uploadAssetMedia(id, slot, file, name, isMobile(variant)));
    }

    @DeleteMapping("/${ADMIN_PAGE}/collections/{id}/assets/{slot}/image")
    public ResponseEntity<CollectionSiteAssetView> deleteAssetImage(
            @PathVariable Long id,
            @PathVariable String slot,
            @RequestParam(value = "variant", required = false) String variant) {
        return ResponseEntity.ok(collectionService.deleteAssetMedia(id, slot, isMobile(variant)));
    }

    private static boolean isMobile(String variant) {
        return "mobile".equalsIgnoreCase(variant);
    }

    @PatchMapping("/${ADMIN_PAGE}/collections/{id}/pick")
    public ResponseEntity<CollectionView> pickMedia(
            @PathVariable Long id,
            @RequestBody PickMediaRequest req) {
        return ResponseEntity.ok(collectionService.pickMedia(id, req));
    }

    @PatchMapping("/${ADMIN_PAGE}/collections/{id}/assets/{slot}/pick")
    public ResponseEntity<CollectionSiteAssetView> pickAssetMedia(
            @PathVariable Long id,
            @PathVariable String slot,
            @RequestBody PickMediaRequest req,
            @RequestParam(value = "variant", required = false) String variant) {
        return ResponseEntity.ok(collectionService.pickAssetMedia(id, slot, req, isMobile(variant)));
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
