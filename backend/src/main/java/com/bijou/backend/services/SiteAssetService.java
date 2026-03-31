package com.bijou.backend.services;

import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.transaction.Transactional;

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

    private static final Set<String> VIDEO_TYPES = Set.of("video/mp4", "video/webm", "video/quicktime");

    private SiteAssetView toView(SiteAsset a) {
        return new SiteAssetView(a.getId(), a.getSlot(), a.getImageUrl(), a.getImageId(), a.getResourceType(), a.getHeaderEn(), a.getHeaderFr(), a.getHeaderEs(), a.getSubheaderEn(), a.getSubheaderFr(), a.getSubheaderEs(), a.getColor(), a.getCtaCategory(), a.getCtaLabelId());
    }

    public List<SiteAssetView> getAll() {
        return siteAssetRepository.findAllByOrderByIdAsc().stream().map(this::toView).toList();
    }

    @Transactional
    public SiteAssetView uploadMedia(String slot, MultipartFile file) {
        SiteAsset asset = findBySlotOrThrow(slot);
        String oldImageId = asset.getImageId();
        String oldResourceType = asset.getResourceType();
        boolean isVideo = VIDEO_TYPES.contains(file.getContentType());
        CloudinaryResponse res = isVideo ? cloudinaryService.uploadVideo(file) : cloudinaryService.upload(file);
        asset.setImageUrl(res.url());
        asset.setImageId(res.imageId());
        asset.setResourceType(isVideo ? "video" : "image");
        SiteAssetView view = toView(siteAssetRepository.saveAndFlush(asset));
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("uploaded {} for site asset slot '{}'", asset.getResourceType(), slot);
        return view;
    }

    @Transactional
    public SiteAssetView deleteMedia(String slot) {
        SiteAsset asset = findBySlotOrThrow(slot);
        String oldImageId = asset.getImageId();
        String oldResourceType = asset.getResourceType();
        asset.setImageUrl(null);
        asset.setImageId(null);
        asset.setResourceType("image");
        SiteAssetView view = toView(siteAssetRepository.saveAndFlush(asset));
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("deleted media for site asset slot '{}'", slot);
        return view;
    }

    public SiteAssetView updateText(String slot, SiteAssetTextRequest req) {
        SiteAsset asset = findBySlotOrThrow(slot);
        asset.setHeaderEn(req.headerEn());
        asset.setHeaderFr(req.headerFr());
        asset.setHeaderEs(req.headerEs());
        asset.setSubheaderEn(req.subheaderEn());
        asset.setSubheaderFr(req.subheaderFr());
        asset.setSubheaderEs(req.subheaderEs());
        asset.setColor(req.color());
        asset.setCtaCategory(req.ctaCategory());
        asset.setCtaLabelId(req.ctaLabelId());
        return toView(siteAssetRepository.save(asset));
    }

    private SiteAsset findBySlotOrThrow(String slot) {
        return siteAssetRepository.findBySlot(slot)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "SITE_ASSET_NOT_FOUND"));
    }
}
