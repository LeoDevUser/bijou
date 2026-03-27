package com.bijou.backend.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.bijou.backend.entities.SiteAsset;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.SiteAssetRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class SiteAssetService {

    private final SiteAssetRepository siteAssetRepository;
    private final CloudinaryService cloudinaryService;

    private SiteAssetView toView(SiteAsset a) {
        return new SiteAssetView(a.getId(), a.getSlot(), a.getImageUrl(), a.getImageId());
    }

    public List<SiteAssetView> getAll() {
        return siteAssetRepository.findAllByOrderByIdAsc().stream().map(this::toView).toList();
    }

    public SiteAssetView uploadImage(String slot, MultipartFile file) {
        SiteAsset asset = findBySlotOrThrow(slot);
        if (asset.getImageId() != null && !asset.getImageId().isEmpty()) {
            cloudinaryService.delete(asset.getImageId());
        }
        CloudinaryResponse res = cloudinaryService.upload(file);
        asset.setImageUrl(res.url());
        asset.setImageId(res.imageId());
        log.info("uploaded image for site asset slot '{}'", slot);
        return toView(siteAssetRepository.save(asset));
    }

    public SiteAssetView deleteImage(String slot) {
        SiteAsset asset = findBySlotOrThrow(slot);
        if (asset.getImageId() != null && !asset.getImageId().isEmpty()) {
            cloudinaryService.delete(asset.getImageId());
        }
        asset.setImageUrl(null);
        asset.setImageId(null);
        log.info("deleted image for site asset slot '{}'", slot);
        return toView(siteAssetRepository.save(asset));
    }

    private SiteAsset findBySlotOrThrow(String slot) {
        return siteAssetRepository.findBySlot(slot)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "SITE_ASSET_NOT_FOUND"));
    }
}
