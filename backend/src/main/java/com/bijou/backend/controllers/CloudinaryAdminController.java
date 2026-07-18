package com.bijou.backend.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bijou.backend.services.CloudinaryResourcesPage;
import com.bijou.backend.services.CloudinaryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class CloudinaryAdminController {

    private final CloudinaryService cloudinaryService;

    @GetMapping("/${ADMIN_PAGE}/cloudinary/resources")
    public ResponseEntity<CloudinaryResourcesPage> listResources(
            @RequestParam(defaultValue = "image") String type,
            @RequestParam(required = false) String nextCursor) {
        return ResponseEntity.ok(cloudinaryService.listResources(type, nextCursor));
    }

    @PatchMapping("/${ADMIN_PAGE}/cloudinary/resources/name")
    public ResponseEntity<Void> renameResource(
            @RequestParam String publicId,
            @RequestParam(defaultValue = "image") String type,
            @RequestParam String name) {
        cloudinaryService.setDisplayName(publicId, type, name);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/${ADMIN_PAGE}/cloudinary/resources")
    public ResponseEntity<Void> deleteResource(
            @RequestParam String publicId,
            @RequestParam(defaultValue = "image") String type) {
        cloudinaryService.delete(publicId, type);
        return ResponseEntity.noContent().build();
    }
}
