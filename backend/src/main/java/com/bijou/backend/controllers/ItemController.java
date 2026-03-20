package com.bijou.backend.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.bijou.backend.entities.Category;
import com.bijou.backend.services.ItemRequest;
import com.bijou.backend.services.ItemService;
import com.bijou.backend.services.ItemView;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @GetMapping("/public/items")
    public ResponseEntity<List<ItemView>> getItems() {
        return ResponseEntity.ok(itemService.getAllItems());
    }

    @GetMapping("/public/items/category/{category}")
    public ResponseEntity<List<ItemView>> getItemsByCategory(@PathVariable Category category) {
        return ResponseEntity.ok(itemService.getItemsByCategory(category));
    }

    @GetMapping("/public/items/{id}")
    public ResponseEntity<ItemView> getItem(@PathVariable Long id) {
        return ResponseEntity.ok(itemService.getItem(id));
    }

    @PostMapping("/${ADMIN_PAGE}/items")
    public ResponseEntity<ItemView> createItem(@Valid @RequestBody ItemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(itemService.createItem(req));
    }

    @PatchMapping("/${ADMIN_PAGE}/items/{id}")
    public ResponseEntity<ItemView> updateItem(@PathVariable Long id,@Valid @RequestBody ItemRequest req) {
        return ResponseEntity.ok(itemService.updateItem(id,req));
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

}
