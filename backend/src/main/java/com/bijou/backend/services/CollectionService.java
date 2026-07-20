package com.bijou.backend.services;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.transaction.Transactional;

import com.bijou.backend.entities.Category;
import com.bijou.backend.entities.Collection;
import com.bijou.backend.entities.CollectionSiteAsset;
import com.bijou.backend.entities.Label;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.CategoryRepository;
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

    private static final List<String> ASSET_SLOTS = List.of("hero", "editorial1", "editorial2", "editorial3", "editorial4");
    private static final Set<String> VIDEO_TYPES = Set.of("video/mp4", "video/webm", "video/quicktime");

    private final CollectionRepository collectionRepository;
    private final CollectionSiteAssetRepository collectionSiteAssetRepository;
    private final CollectionThemeRepository collectionThemeRepository;
    private final LabelRepository labelRepository;
    private final CategoryRepository categoryRepository;
    private final ItemRepository itemRepository;
    private final CloudinaryService cloudinaryService;

    // ── View mappers ────────────────────────────────────────────────────────────

    private CollectionSiteAssetView toAssetView(CollectionSiteAsset a) {
        return new CollectionSiteAssetView(
                a.getId(), a.getSlot(),
                a.getImageUrl(), a.getImageId(), a.getResourceType(),
                a.getHeaderEn(), a.getHeaderFr(), a.getHeaderEs(),
                a.getSubheaderEn(), a.getSubheaderFr(), a.getSubheaderEs(),
                a.getTaglineEn(), a.getTaglineFr(), a.getTaglineEs(),
                a.getColor(), a.getHeaderColor(), a.getSubheaderColor(), a.getTaglineColor(),
                a.getCtaCategory(), a.getCtaLabelId());
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
        List<CategoryView> categories = c.getCategories().stream().map(CategoryService::toView).toList();
        List<CollectionSiteAssetView> assets = c.getSiteAssets().stream()
                .map(this::toAssetView).toList();
        CollectionThemeView theme = collectionThemeRepository.findByCollection_Id(c.getId())
                .map(this::toThemeView).orElse(null);
        return new CollectionView(
                c.getId(), labels, categories,
                c.getImageUrl(), c.getImageId(), c.getResourceType(),
                c.getHeaderEn(), c.getHeaderFr(), c.getHeaderEs(),
                c.getSubheaderEn(), c.getSubheaderFr(), c.getSubheaderEs(),
                c.getColor(), assets, theme,
                c.isActive(), c.isMain());
    }

    // ── Public queries ───────────────────────────────────────────────────────────

    /** Returns all active collections (for the public /collections page). isMain does not affect visibility. */
    public List<CollectionView> getAll() {
        return collectionRepository.findByActiveTrueOrderByIdAsc().stream().map(this::toView).toList();
    }

    /** Returns all collections including inactive and the main one (for the admin panel). */
    public List<CollectionView> getAllForAdmin() {
        return collectionRepository.findAllByOrderByIdAsc().stream().map(this::toView).toList();
    }

    public java.util.Optional<CollectionView> getMain() {
        return collectionRepository.findByIsMainTrue().map(this::toView);
    }

    public CollectionView getById(Long id) {
        return toView(findOrThrow(id));
    }

    public List<ItemView> getItemsByCollection(Long id) {
        return collectItems(findOrThrow(id)).stream().map(this::toItemView).toList();
    }

    public List<ItemView> getTrendingByCollection(Long id) {
        return collectItems(findOrThrow(id)).stream()
                .sorted(Comparator.comparingInt(
                        com.bijou.backend.entities.Item::getNbSoldMonth).reversed())
                .limit(8)
                .map(this::toItemView)
                .toList();
    }

    /** Fetches all active items matching the collection's labels or categories (deduped). */
    private List<com.bijou.backend.entities.Item> collectItems(Collection c) {
        List<Long> labelIds = c.getLabels().stream().map(Label::getId).toList();
        List<Long> categoryIds = c.getCategories().stream().map(Category::getId).toList();
        if (labelIds.isEmpty() && categoryIds.isEmpty()) return List.of();
        java.util.LinkedHashMap<Long, com.bijou.backend.entities.Item> seen = new java.util.LinkedHashMap<>();
        if (!labelIds.isEmpty()) {
            itemRepository.findByAnyLabelIdInAndActiveTrue(labelIds).forEach(i -> seen.put(i.getId(), i));
        }
        if (!categoryIds.isEmpty()) {
            itemRepository.findByCategory_IdInAndActiveTrue(categoryIds).forEach(i -> seen.putIfAbsent(i.getId(), i));
        }
        return new java.util.ArrayList<>(seen.values());
    }

    // ── Admin CRUD ───────────────────────────────────────────────────────────────

    @Transactional
    public CollectionView create(CollectionRequest req) {
        List<Label> labels = resolveLabels(req.labelIds());
        List<Category> categories = resolveCategories(req.categoryIds());
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
        collection.setCategories(categories);
        Collection saved = collectionRepository.save(collection);

        // initialise the three site-asset slots
        for (String slot : ASSET_SLOTS) {
            CollectionSiteAsset asset = CollectionSiteAsset.builder()
                    .collection(saved)
                    .slot(slot)
                    .build();
            saved.getSiteAssets().add(collectionSiteAssetRepository.save(asset));
        }
        CollectionView view = toView(collectionRepository.save(saved));
        log.info("created collection #{} '{}' with {} label(s) and {} category(ies)",
                view.id(), req.headerEn(), labels.size(), categories.size());
        return view;
    }

    public CollectionView updateText(Long id, CollectionRequest req) {
        Collection collection = findOrThrow(id);
        collection.setLabels(resolveLabels(req.labelIds()));
        collection.setCategories(resolveCategories(req.categoryIds()));
        collection.setHeaderEn(req.headerEn());
        collection.setHeaderFr(req.headerFr());
        collection.setHeaderEs(req.headerEs());
        collection.setSubheaderEn(req.subheaderEn());
        collection.setSubheaderFr(req.subheaderFr());
        collection.setSubheaderEs(req.subheaderEs());
        collection.setColor(req.color());
        log.info("updated text/labels for collection #{}", id);
        return toView(collectionRepository.save(collection));
    }

    @Transactional
    public CollectionView uploadMedia(Long id, MultipartFile file, String name) {
        Collection collection = findOrThrow(id);
        String oldImageId = collection.getImageId();
        String oldResourceType = collection.getResourceType();
        boolean isVideo = VIDEO_TYPES.contains(file.getContentType());
        CloudinaryResponse res = isVideo ? cloudinaryService.uploadVideo(file, name) : cloudinaryService.upload(file, name);
        collection.setImageUrl(res.url());
        collection.setImageId(res.imageId());
        collection.setResourceType(isVideo ? "video" : "image");
        CollectionView view = toView(collectionRepository.saveAndFlush(collection));
        safeDelete(oldImageId, oldResourceType, null, id);
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
        safeDelete(oldImageId, oldResourceType, null, id);
        log.info("deleted media for collection #{}", id);
        return view;
    }

    @Transactional
    public void delete(Long id) {
        Collection collection = findOrThrow(id);
        String oldImageId = collection.getImageId();
        String oldResourceType = collection.getResourceType();
        // delete cloudinary media for all site-asset slots (only if not referenced elsewhere)
        for (CollectionSiteAsset asset : collection.getSiteAssets()) {
            safeDelete(asset.getImageId(), asset.getResourceType(), asset.getId(), null);
        }
        collectionRepository.delete(collection);
        collectionRepository.flush();
        safeDelete(oldImageId, oldResourceType, null, id);
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
        asset.setTaglineEn(req.taglineEn());
        asset.setTaglineFr(req.taglineFr());
        asset.setTaglineEs(req.taglineEs());
        asset.setColor(req.color());
        asset.setHeaderColor(req.headerColor());
        asset.setSubheaderColor(req.subheaderColor());
        asset.setTaglineColor(req.taglineColor());
        asset.setCtaCategory(req.ctaCategory());
        asset.setCtaLabelId(req.ctaLabelId());
        log.info("updated text for collection #{} slot {}", collectionId, slot);
        return toAssetView(collectionSiteAssetRepository.save(asset));
    }

    @Transactional
    public CollectionSiteAssetView uploadAssetMedia(Long collectionId, String slot, MultipartFile file, String name) {
        CollectionSiteAsset asset = findAssetOrThrow(collectionId, slot);
        String oldImageId = asset.getImageId();
        String oldResourceType = asset.getResourceType();
        boolean isVideo = VIDEO_TYPES.contains(file.getContentType());
        CloudinaryResponse res = isVideo ? cloudinaryService.uploadVideo(file, name) : cloudinaryService.upload(file, name);
        asset.setImageUrl(res.url());
        asset.setImageId(res.imageId());
        asset.setResourceType(isVideo ? "video" : "image");
        CollectionSiteAssetView view = toAssetView(collectionSiteAssetRepository.saveAndFlush(asset));
        safeDelete(oldImageId, oldResourceType, asset.getId(), null);
        log.info("uploaded {} for collection #{} slot {}", asset.getResourceType(), collectionId, slot);
        return view;
    }

    @Transactional
    public CollectionView pickMedia(Long id, PickMediaRequest req) {
        Collection collection = findOrThrow(id);
        String oldImageId = collection.getImageId();
        String oldResourceType = collection.getResourceType();
        collection.setImageUrl(req.secureUrl());
        collection.setImageId(req.publicId());
        collection.setResourceType(req.resourceType());
        CollectionView view = toView(collectionRepository.saveAndFlush(collection));
        if (oldImageId != null && !oldImageId.isEmpty() && !oldImageId.equals(req.publicId())) {
            safeDelete(oldImageId, oldResourceType, null, id);
        }
        log.info("picked {} '{}' for collection #{} card", req.resourceType(), req.publicId(), id);
        return view;
    }

    @Transactional
    public CollectionSiteAssetView pickAssetMedia(Long collectionId, String slot, PickMediaRequest req) {
        CollectionSiteAsset asset = findAssetOrThrow(collectionId, slot);
        String oldImageId = asset.getImageId();
        String oldResourceType = asset.getResourceType();
        asset.setImageUrl(req.secureUrl());
        asset.setImageId(req.publicId());
        asset.setResourceType(req.resourceType());
        CollectionSiteAssetView view = toAssetView(collectionSiteAssetRepository.saveAndFlush(asset));
        if (oldImageId != null && !oldImageId.isEmpty() && !oldImageId.equals(req.publicId())) {
            safeDelete(oldImageId, oldResourceType, asset.getId(), null);
        }
        log.info("picked {} '{}' for collection #{} slot {}", req.resourceType(), req.publicId(), collectionId, slot);
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
        safeDelete(oldImageId, oldResourceType, asset.getId(), null);
        log.info("deleted media for collection #{} slot {}", collectionId, slot);
        return view;
    }

    // ── Theme management ─────────────────────────────────────────────────────────

    public CollectionThemeView updateTheme(Long collectionId, CollectionThemeRequest req) {
        Collection collection = findOrThrow(collectionId);
        boolean isNew = collectionThemeRepository.findByCollection_Id(collectionId).isEmpty();
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
        CollectionThemeView view = toThemeView(collectionThemeRepository.save(theme));
        log.info("{} theme for collection #{}", isNew ? "created" : "updated", collectionId);
        return view;
    }

    @Transactional
    public void deleteTheme(Long collectionId) {
        findOrThrow(collectionId); // validate collection exists
        collectionThemeRepository.deleteByCollection_Id(collectionId);
        log.info("removed custom theme for collection #{}", collectionId);
    }

    // ── Active / Main management ─────────────────────────────────────────────────

    @Transactional
    public CollectionView setMain(Long id) {
        // Lock current main first (if any) to serialise concurrent setMain calls.
        collectionRepository.findByIsMainTrueWithLock().ifPresent(current -> {
            log.info("clearing isMain from collection #{}", current.getId());
            current.setMain(false);
            collectionRepository.save(current);
        });
        // Lock the target collection before promoting it.
        Collection collection = collectionRepository.findByIdWithLock(id)
                .orElseThrow(() -> new com.bijou.backend.exception.AppException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "COLLECTION_NOT_FOUND"));
        collection.setMain(true);
        log.info("set collection #{} '{}' as main", id, collection.getHeaderEn());
        return toView(collectionRepository.save(collection));
    }

    public CollectionView setActive(Long id, boolean active) {
        Collection collection = findOrThrow(id);
        collection.setActive(active);
        log.info("collection #{} marked {}", id, active ? "active" : "inactive");
        return toView(collectionRepository.save(collection));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private ItemView toItemView(com.bijou.backend.entities.Item item) {
        List<LabelView> labelViews = item.getLabels().stream().map(LabelService::toView).toList();
        List<ItemAssetView> assetViews = item.getAssets() == null ? List.of() :
                item.getAssets().stream()
                        .map(a -> new ItemAssetView(a.getId(), a.getImageUrl(), a.getImageId(), a.getResourceType()))
                        .toList();
        List<ItemSizeView> sizeViews = item.getSizes() == null ? List.of() :
                item.getSizes().stream()
                        .map(s -> new ItemSizeView(s.getId(), s.getSize(), s.getStock(), s.getWeightGrams(), s.getPrice(),
                                s.getPricingWork(), s.getDescriptionEn(), s.getDescriptionFr(), s.getDescriptionEs(),
                                s.getSortOrder(), s.isActive()))
                        .toList();
        return new ItemView(
                item.getId(), item.getStock(),
                item.getNameEn(), item.getNameFr(), item.getNameEs(),
                item.getPrice(), labelViews, CategoryService.toView(item.getCategory()),
                item.getDescriptionEn(), item.getDescriptionFr(), item.getDescriptionEs(),
                assetViews, sizeViews, item.getDiscountPercent(), item.getMaterial(), item.isUsmcaQualified(), item.getWeightGrams(),
                item.getPricingFormula(), item.getPricingWork(), item.getPricingMargin());
    }

    /**
     * Returns true if the given Cloudinary imageId is still referenced by any
     * slot or collection card other than the one being replaced.
     * When true, we must NOT delete from Cloudinary.
     *
     * @param excludeAssetId      the slot asset being replaced (null if replacing a collection card)
     * @param excludeCollectionId the collection card being replaced (null if replacing a slot)
     */
    private boolean isImageInUseElsewhere(String imageId, Long excludeAssetId, Long excludeCollectionId) {
        if (imageId == null || imageId.isEmpty()) return false;
        boolean usedBySlot = excludeAssetId != null
                ? collectionSiteAssetRepository.existsByImageIdAndIdNot(imageId, excludeAssetId)
                : collectionSiteAssetRepository.existsByImageId(imageId);
        boolean usedByCard = excludeCollectionId != null
                ? collectionRepository.existsByImageIdAndIdNot(imageId, excludeCollectionId)
                : collectionRepository.existsByImageId(imageId);
        return usedBySlot || usedByCard;
    }

    private void safeDelete(String imageId, String resourceType, Long excludeAssetId, Long excludeCollectionId) {
        if (imageId == null || imageId.isEmpty()) return;
        if (isImageInUseElsewhere(imageId, excludeAssetId, excludeCollectionId)) {
            log.info("skipping cloudinary delete of '{}' — still referenced elsewhere", imageId);
            return;
        }
        cloudinaryService.delete(imageId, resourceType);
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

    private List<Category> resolveCategories(List<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) return new java.util.ArrayList<>();
        return categoryRepository.findAllById(categoryIds);
    }
}
