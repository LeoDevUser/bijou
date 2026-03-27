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

import com.bijou.backend.services.AnnouncementRequest;
import com.bijou.backend.services.AnnouncementService;
import com.bijou.backend.services.AnnouncementView;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @GetMapping("/public/announcements")
    public ResponseEntity<List<AnnouncementView>> getActive() {
        return ResponseEntity.ok(announcementService.getActive());
    }

    @GetMapping("/${ADMIN_PAGE}/announcements")
    public ResponseEntity<List<AnnouncementView>> getAll() {
        return ResponseEntity.ok(announcementService.getAll());
    }

    @PostMapping("/${ADMIN_PAGE}/announcements")
    public ResponseEntity<AnnouncementView> create(@RequestBody AnnouncementRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(announcementService.create(req));
    }

    @PatchMapping("/${ADMIN_PAGE}/announcements/{id}")
    public ResponseEntity<AnnouncementView> update(@PathVariable Long id, @RequestBody AnnouncementRequest req) {
        return ResponseEntity.ok(announcementService.update(id, req));
    }

    @DeleteMapping("/${ADMIN_PAGE}/announcements/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        announcementService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/${ADMIN_PAGE}/announcements/{id}/up")
    public ResponseEntity<List<AnnouncementView>> moveUp(@PathVariable Long id) {
        return ResponseEntity.ok(announcementService.moveUp(id));
    }

    @PatchMapping("/${ADMIN_PAGE}/announcements/{id}/down")
    public ResponseEntity<List<AnnouncementView>> moveDown(@PathVariable Long id) {
        return ResponseEntity.ok(announcementService.moveDown(id));
    }
}
