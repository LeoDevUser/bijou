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

import com.bijou.backend.repositories.SalesStats;
import com.bijou.backend.services.CloudinaryResponse;
import com.bijou.backend.services.CloudinaryService;
import com.bijou.backend.services.ItemRequest;
import com.bijou.backend.services.ItemService;
import com.bijou.backend.services.ItemView;
import com.bijou.backend.services.ItemViewVerbose;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;
    private final CloudinaryService cloudinaryService;

    @GetMapping("/public/items")
    public ResponseEntity<List<ItemView>> getItems() {
        return ResponseEntity.ok(itemService.getAllItems());
    }

    @GetMapping("/public/items/trending")
    public ResponseEntity<List<ItemView>> getTrendingItems() {
        return ResponseEntity.ok(itemService.getMonthTrendingItems());
    }

    @GetMapping("/public/items/bestselling")
    public ResponseEntity<List<ItemView>> getItemsBySales() {
        return ResponseEntity.ok(itemService.getAllItemsSortedBySalesVolume());
    }

    @GetMapping("/public/items/category/{id}")
    public ResponseEntity<List<ItemView>> getItemsByCategory(@PathVariable Long id) {
        return ResponseEntity.ok(itemService.getItemsByCategory(id));
    }

    @GetMapping("/public/items/label/{id}")
    public ResponseEntity<List<ItemView>> getItemsByLabel(@PathVariable Long id) {
        return ResponseEntity.ok(itemService.getItemsByLabel(id));
    }

    @GetMapping("/public/items/{id}")
    public ResponseEntity<ItemView> getItem(@PathVariable Long id) {
        return ResponseEntity.ok(itemService.getItem(id));
    }

    @PostMapping("/${ADMIN_PAGE}/items")
    public ResponseEntity<ItemView> createItem(@Valid @RequestBody ItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(itemService.createItem(req));
    }

    @PostMapping(value = "/${ADMIN_PAGE}/items", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ItemView> createItemWithImage(
            @RequestPart("item") @Valid ItemRequest req,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        ItemView view = itemService.createItem(req);
        if (file != null && !file.isEmpty()) {
            view = itemService.addAsset(view.id(), cloudinaryService.upload(file), "image");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(view);
    }

    @PatchMapping("/${ADMIN_PAGE}/items/{id}")
    public ResponseEntity<ItemView> updateItem(@PathVariable Long id, @Valid @RequestBody ItemRequest req) {
        return ResponseEntity.ok(itemService.updateItem(id, req));
    }

    @PatchMapping(value = "/${ADMIN_PAGE}/items/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ItemView> updateItemWithImage(
            @PathVariable Long id,
            @RequestPart("item") @Valid ItemRequest req,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        ItemView view = itemService.updateItem(id, req);
        if (file != null && !file.isEmpty()) {
            view = itemService.addAsset(view.id(), cloudinaryService.upload(file), "image");
        }
        return ResponseEntity.ok(view);
    }

    @PostMapping(value = "/${ADMIN_PAGE}/items/{itemId}/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ItemView> addAsset(@PathVariable Long itemId, @RequestPart("file") MultipartFile file) {
        String contentType = file.getContentType();
        CloudinaryResponse res;
        String resourceType;
        if (contentType != null && contentType.startsWith("video/")) {
            res = cloudinaryService.uploadVideo(file);
            resourceType = "video";
        } else {
            res = cloudinaryService.upload(file);
            resourceType = "image";
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(itemService.addAsset(itemId, res, resourceType));
    }

    @DeleteMapping("/${ADMIN_PAGE}/items/{itemId}/assets/{assetId}")
    public ResponseEntity<ItemView> deleteAsset(@PathVariable Long itemId, @PathVariable Long assetId) {
        return ResponseEntity.ok(itemService.deleteAsset(itemId, assetId));
    }

    @DeleteMapping("/${ADMIN_PAGE}/items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        itemService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/${ADMIN_PAGE}/items/deactivate/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        itemService.deactivate(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/${ADMIN_PAGE}/items/activate/{id}")
    public ResponseEntity<Void> activate(@PathVariable Long id) {
        itemService.activate(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/${ADMIN_PAGE}/items")
    public ResponseEntity<List<ItemViewVerbose>> getItemsVerbose() {
        return ResponseEntity.ok(itemService.getItemsVerbose());
    }

    @GetMapping("/${ADMIN_PAGE}/items/salesstats")
    public ResponseEntity<SalesStats> getSalesStats() {
        return ResponseEntity.ok(itemService.getSalesStats());
    }
}
