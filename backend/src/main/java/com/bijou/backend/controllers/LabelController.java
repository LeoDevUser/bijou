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

import com.bijou.backend.services.LabelRequest;
import com.bijou.backend.services.LabelService;
import com.bijou.backend.services.LabelView;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class LabelController {

    private final LabelService labelService;

    @GetMapping("/public/labels")
    public ResponseEntity<List<LabelView>> getAll() {
        return ResponseEntity.ok(labelService.getAll());
    }

    @PostMapping("/${ADMIN_PAGE}/labels")
    public ResponseEntity<LabelView> create(@RequestBody LabelRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(labelService.create(req));
    }

    @PatchMapping("/${ADMIN_PAGE}/labels/{id}")
    public ResponseEntity<LabelView> update(@PathVariable Long id, @RequestBody LabelRequest req) {
        return ResponseEntity.ok(labelService.update(id, req));
    }

    @DeleteMapping("/${ADMIN_PAGE}/labels/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        labelService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
