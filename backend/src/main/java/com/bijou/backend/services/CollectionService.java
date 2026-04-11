package com.bijou.backend.services;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.transaction.Transactional;

import com.bijou.backend.entities.Collection;
import com.bijou.backend.entities.CollectionSiteAsset;
import com.bijou.backend.entities.Label;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.CollectionRepository;
import com.bijou.backend.repositories.CollectionSiteAssetRepository;
import com.bijou.backend.repositories.CollectionThemeRepository;
import com.bijou.backend.repositories.ItemRepository;
import com.bijou.backend.repositories.LabelRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollectionService {

    private static final List<String> ASSET_SLOTS = List.of("hero", "editorial1", "editorial2");
    private static final Set<String> VIDEO_TYPES = Set.of("video/mp4", "video/webm", "video/quicktime");

    private final CollectionRepository collectionRepository;
    private final CollectionSiteAssetRepository collectionSiteAssetRepository;
    private final CollectionThemeRepository collectionThemeRepository;
    private final LabelRepository labelRepository;
    private final ItemRepository itemRepository;
    private final CloudinaryService cloudinaryService;

    // ── View mappers ────────────────────────────────────────────────────────────

    private CollectionSiteAssetView toAssetView(CollectionSiteAsset a) {
        return new CollectionSiteAssetView(
                a.getId(), a.getSlot(),
                a.getImageUrl(), a.getImageId(), a.getResourceType(),
                a.getHeaderEn(), a.getHeaderFr(), a.getHeaderEs(),
                a.getSubheaderEn(), a.getSubheaderFr(), a.getSubheaderEs(),
                a.getColor(), a.getCtaCategory(), a.getCtaLabelId());
    }

    private CollectionThemeView toThemeView(com.bijou.backend.entities.CollectionTheme t) {
        return new CollectionThemeView(
                t.getNavbarBg(), t.getNavbarText(), t.getNavbarTextSelected(), t.getNavbarTextInactive(),
                t.getAnnouncementBg(), t.getAnnouncementText(),
                t.getSiteBg(), t.getSiteText(),
                t.getCardText(), t.getCardButtonBg(), t.getCardButtonText(),
                t.getNavbarSeparator(), t.getSiteTextMuted(), t.getSiteTextAccent(), t.getSiteSeparator());
    }

    private CollectionView toView(Collection c) {
        List<LabelView> labels = c.getLabels().stream().map(LabelService::toView).toList();
        List<CollectionSiteAssetView> assets = c.getSiteAssets().stream()
                .map(this::toAssetView).toList();
        CollectionThemeView theme = collectionThemeRepository.findByCollection_Id(c.getId())
                .map(this::toThemeView).orElse(null);
        return new CollectionView(
                c.getId(), labels,
                c.getImageUrl(), c.getImageId(), c.getResourceType(),
                c.getHeaderEn(), c.getHeaderFr(), c.getHeaderEs(),
                c.getSubheaderEn(), c.getSubheaderFr(), c.getSubheaderEs(),
                c.getColor(), assets, theme);
    }

    // ── Public queries ───────────────────────────────────────────────────────────

    public List<CollectionView> getAll() {
        return collectionRepository.findAllByOrderByIdAsc().stream().map(this::toView).toList();
    }

    public CollectionView getById(Long id) {
        return toView(findOrThrow(id));
    }

    public List<ItemView> getItemsByCollection(Long id) {
        Collection c = findOrThrow(id);
        List<Long> labelIds = c.getLabels().stream().map(Label::getId).toList();
        if (labelIds.isEmpty()) return List.of();
        return itemRepository.findByAnyLabelIdInAndActiveTrue(labelIds).stream()
                .map(this::toItemView).toList();
    }

    public List<ItemView> getTrendingByCollection(Long id) {
        Collection c = findOrThrow(id);
        List<Long> labelIds = c.getLabels().stream().map(Label::getId).toList();
        if (labelIds.isEmpty()) return List.of();
        return itemRepository.findByAnyLabelIdInAndActiveTrue(labelIds).stream()
                .sorted(Comparator.comparingInt(
                        com.bijou.backend.entities.Item::getNbSoldMonth).reversed())
                .limit(8)
                .map(this::toItemView)
                .toList();
    }

    // ── Admin CRUD ───────────────────────────────────────────────────────────────

    @Transactional
    public CollectionView create(CollectionRequest req) {
        List<Label> labels = resolveLabels(req.labelIds());
        Collection collection = Collection.builder()
                .headerEn(req.headerEn())
                .headerFr(req.headerFr())
                .headerEs(req.headerEs())
                .subheaderEn(req.subheaderEn())
                .subheaderFr(req.subheaderFr())
                .subheaderEs(req.subheaderEs())
                .color(req.color())
                .build();
        collection.setLabels(labels);
        Collection saved = collectionRepository.save(collection);

        // initialise the three site-asset slots
        for (String slot : ASSET_SLOTS) {
            CollectionSiteAsset asset = CollectionSiteAsset.builder()
                    .collection(saved)
                    .slot(slot)
                    .build();
            saved.getSiteAssets().add(collectionSiteAssetRepository.save(asset));
        }
        return toView(collectionRepository.save(saved));
    }

    public CollectionView updateText(Long id, CollectionRequest req) {
        Collection collection = findOrThrow(id);
        collection.setLabels(resolveLabels(req.labelIds()));
        collection.setHeaderEn(req.headerEn());
        collection.setHeaderFr(req.headerFr());
        collection.setHeaderEs(req.headerEs());
        collection.setSubheaderEn(req.subheaderEn());
        collection.setSubheaderFr(req.subheaderFr());
        collection.setSubheaderEs(req.subheaderEs());
        collection.setColor(req.color());
        return toView(collectionRepository.save(collection));
    }

    @Transactional
    public CollectionView uploadMedia(Long id, MultipartFile file) {
        Collection collection = findOrThrow(id);
        String oldImageId = collection.getImageId();
        String oldResourceType = collection.getResourceType();
        boolean isVideo = VIDEO_TYPES.contains(file.getContentType());
        CloudinaryResponse res = isVideo ? cloudinaryService.uploadVideo(file) : cloudinaryService.upload(file);
        collection.setImageUrl(res.url());
        collection.setImageId(res.imageId());
        collection.setResourceType(isVideo ? "video" : "image");
        CollectionView view = toView(collectionRepository.saveAndFlush(collection));
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("uploaded {} for collection #{}", collection.getResourceType(), id);
        return view;
    }

    @Transactional
    public CollectionView deleteMedia(Long id) {
        Collection collection = findOrThrow(id);
        String oldImageId = collection.getImageId();
        String oldResourceType = collection.getResourceType();
        collection.setImageUrl(null);
        collection.setImageId(null);
        collection.setResourceType("image");
        CollectionView view = toView(collectionRepository.saveAndFlush(collection));
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("deleted media for collection #{}", id);
        return view;
    }

    @Transactional
    public void delete(Long id) {
        Collection collection = findOrThrow(id);
        String oldImageId = collection.getImageId();
        String oldResourceType = collection.getResourceType();
        // delete cloudinary media for all site-asset slots
        for (CollectionSiteAsset asset : collection.getSiteAssets()) {
            if (asset.getImageId() != null && !asset.getImageId().isEmpty()) {
                cloudinaryService.delete(asset.getImageId(), asset.getResourceType());
            }
        }
        collectionRepository.delete(collection);
        collectionRepository.flush();
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("deleted collection #{}", id);
    }

    // ── Asset management ─────────────────────────────────────────────────────────

    public CollectionSiteAssetView updateAssetText(Long collectionId, String slot, CollectionAssetRequest req) {
        CollectionSiteAsset asset = findAssetOrThrow(collectionId, slot);
        asset.setHeaderEn(req.headerEn());
        asset.setHeaderFr(req.headerFr());
        asset.setHeaderEs(req.headerEs());
        asset.setSubheaderEn(req.subheaderEn());
        asset.setSubheaderFr(req.subheaderFr());
        asset.setSubheaderEs(req.subheaderEs());
        asset.setColor(req.color());
        asset.setCtaCategory(req.ctaCategory());
        asset.setCtaLabelId(req.ctaLabelId());
        return toAssetView(collectionSiteAssetRepository.save(asset));
    }

    @Transactional
    public CollectionSiteAssetView uploadAssetMedia(Long collectionId, String slot, MultipartFile file) {
        CollectionSiteAsset asset = findAssetOrThrow(collectionId, slot);
        String oldImageId = asset.getImageId();
        String oldResourceType = asset.getResourceType();
        boolean isVideo = VIDEO_TYPES.contains(file.getContentType());
        CloudinaryResponse res = isVideo ? cloudinaryService.uploadVideo(file) : cloudinaryService.upload(file);
        asset.setImageUrl(res.url());
        asset.setImageId(res.imageId());
        asset.setResourceType(isVideo ? "video" : "image");
        CollectionSiteAssetView view = toAssetView(collectionSiteAssetRepository.saveAndFlush(asset));
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("uploaded {} for collection #{} slot {}", asset.getResourceType(), collectionId, slot);
        return view;
    }

    @Transactional
    public CollectionSiteAssetView deleteAssetMedia(Long collectionId, String slot) {
        CollectionSiteAsset asset = findAssetOrThrow(collectionId, slot);
        String oldImageId = asset.getImageId();
        String oldResourceType = asset.getResourceType();
        asset.setImageUrl(null);
        asset.setImageId(null);
        asset.setResourceType("image");
        CollectionSiteAssetView view = toAssetView(collectionSiteAssetRepository.saveAndFlush(asset));
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("deleted media for collection #{} slot {}", collectionId, slot);
        return view;
    }

    // ── Theme management ─────────────────────────────────────────────────────────

    public CollectionThemeView updateTheme(Long collectionId, CollectionThemeRequest req) {
        Collection collection = findOrThrow(collectionId);
        com.bijou.backend.entities.CollectionTheme theme = collectionThemeRepository
                .findByCollection_Id(collectionId)
                .orElseGet(() -> com.bijou.backend.entities.CollectionTheme.builder()
                        .collection(collection)
                        .build());
        theme.setNavbarBg(req.navbarBg());
        theme.setNavbarText(req.navbarText());
        theme.setNavbarTextSelected(req.navbarTextSelected());
        theme.setNavbarTextInactive(req.navbarTextInactive());
        theme.setAnnouncementBg(req.announcementBg());
        theme.setAnnouncementText(req.announcementText());
        theme.setSiteBg(req.siteBg());
        theme.setSiteText(req.siteText());
        theme.setCardText(req.cardText());
        theme.setCardButtonBg(req.cardButtonBg());
        theme.setCardButtonText(req.cardButtonText());
        theme.setNavbarSeparator(req.navbarSeparator());
        theme.setSiteTextMuted(req.siteTextMuted());
        theme.setSiteTextAccent(req.siteTextAccent());
        theme.setSiteSeparator(req.siteSeparator());
        return toThemeView(collectionThemeRepository.save(theme));
    }

    @Transactional
    public void deleteTheme(Long collectionId) {
        findOrThrow(collectionId); // validate collection exists
        collectionThemeRepository.deleteByCollection_Id(collectionId);
        log.info("removed custom theme for collection #{}", collectionId);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private ItemView toItemView(com.bijou.backend.entities.Item item) {
        List<LabelView> labelViews = item.getLabels().stream().map(LabelService::toView).toList();
        List<ItemAssetView> assetViews = item.getAssets() == null ? List.of() :
                item.getAssets().stream()
                        .map(a -> new ItemAssetView(a.getId(), a.getImageUrl(), a.getImageId(), a.getResourceType()))
                        .toList();
        return new ItemView(
                item.getId(), item.getStock(),
                item.getNameEn(), item.getNameFr(), item.getNameEs(),
                item.getPrice(), labelViews, CategoryService.toView(item.getCategory()),
                item.getDescriptionEn(), item.getDescriptionFr(), item.getDescriptionEs(),
                assetViews, item.getDiscountPercent(), item.getMaterial(), item.isUsmcaQualified());
    }

    private Collection findOrThrow(Long id) {
        return collectionRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "COLLECTION_NOT_FOUND"));
    }

    private CollectionSiteAsset findAssetOrThrow(Long collectionId, String slot) {
        return collectionSiteAssetRepository.findByCollection_IdAndSlot(collectionId, slot)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "COLLECTION_ASSET_NOT_FOUND"));
    }

    private List<Label> resolveLabels(List<Long> labelIds) {
        if (labelIds == null || labelIds.isEmpty()) return new java.util.ArrayList<>();
        return labelRepository.findAllById(labelIds);
    }
}
