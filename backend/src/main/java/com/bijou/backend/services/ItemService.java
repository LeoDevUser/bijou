package com.bijou.backend.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;

import com.bijou.backend.entities.Category;
import com.bijou.backend.entities.Item;
import com.bijou.backend.entities.ItemAsset;
import com.bijou.backend.entities.ItemSize;
import com.bijou.backend.entities.JewelryMaterial;
import com.bijou.backend.entities.Label;
import com.bijou.backend.entities.PricingFormula;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.CategoryRepository;
import com.bijou.backend.repositories.ItemRepository;
import com.bijou.backend.repositories.LabelRepository;
import com.bijou.backend.repositories.MaterialSalesStats;
import com.bijou.backend.repositories.MaterialSalesStats.MaterialBucket;
import com.bijou.backend.repositories.OrderRepository;
import com.bijou.backend.repositories.RevenueStats;
import com.bijou.backend.repositories.SalesStats;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ItemService {

    private final CloudinaryService cloudinaryService;
    private final ItemRepository itemRepository;
    private final LabelRepository labelRepository;
    private final CategoryRepository categoryRepository;
    private final OrderRepository orderRepository;
    private final DynamicPricingService dynamicPricingService;

    /**
     * Static price from the request, unless a pricing formula is set and the
     * metal feed has data — then the computed price wins. Falls back to the
     * admin-entered price so a feed outage never blocks saving an item.
     *
     * <p>A static price flagged {@code priceIncludesTax} is entered with 16 % IVA
     * already applied, so the IVA is backed out before storing: items always hold
     * the taxable base, since IVA is assessed per order at checkout (and waived on
     * gold when the client requests a factura). Formula prices are computed net
     * from the metal cost, so the flag never applies to them.</p>
     */
    private BigDecimal resolvePrice(ItemRequest req) {
        BigDecimal work = req.pricingWork() == null ? null : BigDecimal.valueOf(req.pricingWork());
        BigDecimal margin = req.pricingMargin() == null ? null : BigDecimal.valueOf(req.pricingMargin());
        return dynamicPricingService.computePrice(req.pricingFormula(), req.weightGrams(), work, margin)
                .orElseGet(() -> netPrice(BigDecimal.valueOf(req.price()), req.priceIncludesTax()));
    }

    /** Strips the IVA an admin-entered price was typed with, if any. */
    private BigDecimal netPrice(BigDecimal entered, boolean includesTax) {
        return includesTax ? TaxService.netFromTaxInclusive(entered) : entered;
    }

    private List<LabelView> toLabelViews(List<Label> labels) {
        if (labels == null) return List.of();
        return labels.stream().map(LabelService::toView).toList();
    }

    private List<ItemAssetView> toAssetViews(List<ItemAsset> assets) {
        if (assets == null) return List.of();
        return assets.stream()
            .map(a -> new ItemAssetView(a.getId(), a.getImageUrl(), a.getImageId(), a.getResourceType()))
            .toList();
    }

    private List<ItemSizeView> toSizeViews(List<ItemSize> sizes) {
        if (sizes == null) return List.of();
        return sizes.stream()
            .map(s -> new ItemSizeView(
                s.getId(), s.getSizeEn(), s.getSizeFr(), s.getSizeEs(), s.getStock(), s.getVersion(), s.getWeightGrams(), s.getPrice(), s.getPricingWork(),
                s.getDescriptionEn(), s.getDescriptionFr(), s.getDescriptionEs(), s.getSortOrder(), s.isActive(),
                toAssetViews(s.getAssets())))
            .toList();
    }

    /**
     * Effective price of a size: the formula-computed price (weight-driven, using
     * the item's formula/margin and the size's work override) when the item is
     * formula-priced, otherwise the size's own static price — entered under the
     * item's tax mode, so IVA is backed out here too.
     */
    private BigDecimal resolveSizePrice(Item item, ItemSizeRequest req) {
        BigDecimal work = req.pricingWork() != null ? BigDecimal.valueOf(req.pricingWork()) : item.getPricingWork();
        return dynamicPricingService
            .computePrice(item.getPricingFormula(), req.weightGrams(), work, item.getPricingMargin())
            .orElseGet(() -> req.price() != null
                ? netPrice(BigDecimal.valueOf(req.price()), item.isPriceIncludesTax())
                : BigDecimal.ZERO);
    }

    private List<Label> resolveLabels(List<Long> labelIds) {
        if (labelIds == null || labelIds.isEmpty()) return List.of();
        return labelRepository.findAllById(labelIds);
    }

    private Category resolveCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND"));
    }

    private List<Category> resolveCategories(List<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) return new java.util.ArrayList<>();
        List<Category> categories = categoryRepository.findAllById(categoryIds);
        if (categories.size() != categoryIds.stream().distinct().count()) {
            throw new AppException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND");
        }
        return categories;
    }

    private List<CategoryView> toCategoryViews(List<Category> categories) {
        if (categories == null) return List.of();
        return categories.stream().map(CategoryService::toView).toList();
    }

    private String displayName(Item item) {
        if (item.getNameEn() != null) return item.getNameEn();
        if (item.getNameFr() != null) return item.getNameFr();
        return item.getNameEs() != null ? item.getNameEs() : String.valueOf(item.getId());
    }

    private ItemView toItemView(Item item) {
        return new ItemView(
                item.getId(), item.getStock(), item.getVersion(),
                item.getNameEn(), item.getNameFr(), item.getNameEs(),
                item.getPrice(), item.isPriceIncludesTax(),
                toLabelViews(item.getLabels()), toCategoryViews(item.getCategories()),
                item.getDescriptionEn(), item.getDescriptionFr(), item.getDescriptionEs(),
                toAssetViews(item.getAssets()),
                toSizeViews(item.getSizes()),
                item.getDiscountPercent(),
                item.getMaterial(),
                item.isUsmcaQualified(),
                item.getWeightGrams(),
                item.getPricingFormula(),
                item.getPricingWork(),
                item.getPricingMargin()
            );
    }

    private ItemViewVerbose toItemViewVerbose(Item item) {
        return new ItemViewVerbose(
                item.getId(), item.getStock(), item.getVersion(),
                item.getNameEn(), item.getNameFr(), item.getNameEs(),
                item.getPrice(), item.isPriceIncludesTax(),
                toLabelViews(item.getLabels()), toCategoryViews(item.getCategories()),
                item.getDescriptionEn(), item.getDescriptionFr(), item.getDescriptionEs(),
                toAssetViews(item.getAssets()),
                toSizeViews(item.getSizes()),
                item.getNbSold(), item.getNbSoldMonth(), item.getTotalSales(),
                item.getTotalSalesWeek(), item.getTotalSalesMonth(), item.getTotalSalesQuarter(),
                item.getTotalSalesYear(), item.isActive(),
                item.getDiscountPercent(),
                item.getMaterial(),
                item.isUsmcaQualified(),
                item.getWeightGrams(),
                item.getPricingFormula(),
                item.getPricingWork(),
                item.getPricingMargin()
            );
    }

    public ItemView createItem(ItemRequest req) {
        if (req.nameEn() != null && !req.nameEn().isBlank() &&
                itemRepository.findByNameEnIgnoreCase(req.nameEn()).isPresent()) {
            log.warn("item with nameEn {} already exists", req.nameEn());
            throw new AppException(HttpStatus.CONFLICT, "ITEM_NAME_CONFLICT", req.nameEn());
        }
        Item item = Item.builder()
            .stock(req.stock())
            .price(resolvePrice(req))
            .priceIncludesTax(req.priceIncludesTax())
            .pricingFormula(req.pricingFormula())
            .pricingWork(req.pricingWork() == null ? null : BigDecimal.valueOf(req.pricingWork()))
            .pricingMargin(req.pricingMargin() == null ? null : BigDecimal.valueOf(req.pricingMargin()))
            .nameEn(req.nameEn())
            .nameFr(req.nameFr())
            .nameEs(req.nameEs())
            .labels(resolveLabels(req.labelIds()))
            .categories(resolveCategories(req.categoryIds()))
            .descriptionEn(req.descriptionEn())
            .descriptionFr(req.descriptionFr())
            .descriptionEs(req.descriptionEs())
            .discountPercent(req.discountPercent())
            .material(req.material())
            .usmcaQualified(req.usmcaQualified())
            .weightGrams(req.weightGrams())
            .build();
        itemRepository.save(item);
        log.info("created item #{} ({})", item.getId(), displayName(item));
        return toItemView(item);
    }

    public ItemView updateItem(Long id, ItemRequest req) {
        Item item = findItemOrThrow(id);
        item.setNameEn(req.nameEn());
        item.setNameFr(req.nameFr());
        item.setNameEs(req.nameEs());
        // Stock is deliberately NOT written here — it changes concurrently with
        // checkouts, so an unrelated edit must not clobber it. Stock is managed
        // only through the dedicated adjustStock / setStock operations below.
        item.setPricingFormula(req.pricingFormula());
        item.setPricingWork(req.pricingWork() == null ? null : BigDecimal.valueOf(req.pricingWork()));
        item.setPricingMargin(req.pricingMargin() == null ? null : BigDecimal.valueOf(req.pricingMargin()));
        // Existing size prices are left alone when this flag flips: they were entered
        // under the old mode and are re-normalised the next time each size is saved.
        item.setPriceIncludesTax(req.priceIncludesTax());
        item.setPrice(resolvePrice(req));
        item.setLabels(resolveLabels(req.labelIds()));
        item.setCategories(resolveCategories(req.categoryIds()));
        item.setDescriptionEn(req.descriptionEn());
        item.setDescriptionFr(req.descriptionFr());
        item.setDescriptionEs(req.descriptionEs());
        item.setDiscountPercent(req.discountPercent());
        item.setMaterial(req.material());
        item.setUsmcaQualified(req.usmcaQualified());
        item.setWeightGrams(req.weightGrams());
        itemRepository.save(item);
        log.info("updated item #{} ({})", id, displayName(item));
        return toItemView(item);
    }

    /**
     * The gallery an asset lives in: the item's own when {@code sizeId} is null,
     * otherwise that size's. Both are ordered lists whose {@code sortOrder} is
     * resequenced by position, so they're interchangeable to every caller below.
     */
    private List<ItemAsset> assetScope(Item item, Long sizeId) {
        return sizeId == null ? item.getAssets() : findSizeOrThrow(item, sizeId).getAssets();
    }

    /** Finds the gallery holding {@code assetId}, searching the item then its sizes. */
    private List<ItemAsset> owningScope(Item item, Long assetId) {
        if (item.getAssets().stream().anyMatch(a -> a.getId().equals(assetId))) return item.getAssets();
        for (ItemSize size : item.getSizes()) {
            if (size.getAssets().stream().anyMatch(a -> a.getId().equals(assetId))) return size.getAssets();
        }
        throw new AppException(HttpStatus.NOT_FOUND, "ASSET_NOT_FOUND");
    }

    private static void resequence(List<ItemAsset> assets) {
        for (int i = 0; i < assets.size(); i++) {
            assets.get(i).setSortOrder(i);
        }
    }

    /** Every asset on the item, its sizes' included — for bulk Cloudinary cleanup. */
    private List<ItemAsset> allAssets(Item item) {
        List<ItemAsset> all = new java.util.ArrayList<>(item.getAssets());
        item.getSizes().forEach(s -> all.addAll(s.getAssets()));
        return all;
    }

    /**
     * Drops the Cloudinary files behind {@code removed} — but only those the item no
     * longer shows anywhere. A copy handed to a size points at the same file as the
     * original, so deleting one of them must leave the file alone while the other
     * still needs it. Call after the removal has been flushed, so {@code item}
     * reflects what actually survives.
     */
    private void deleteFilesNoLongerUsed(Item item, List<ItemAsset> removed) {
        Set<String> stillShown = allAssets(item).stream()
            .map(ItemAsset::getImageId)
            .filter(java.util.Objects::nonNull)
            .collect(java.util.stream.Collectors.toSet());
        removed.stream()
            .filter(ItemAsset::isOwned)
            .filter(a -> a.getImageId() != null && !stillShown.contains(a.getImageId()))
            // Two removed rows can share a file (original and copy deleted together).
            .collect(java.util.stream.Collectors.toMap(ItemAsset::getImageId, a -> a, (first, dup) -> first))
            .values()
            .forEach(a -> cloudinaryService.delete(a.getImageId(), a.getResourceType()));
    }

    /** Uploaded media. A null {@code sizeId} adds to the item's shared gallery. */
    @Transactional
    public ItemView addAsset(Long itemId, Long sizeId, CloudinaryResponse res, String resourceType) {
        Item item = findAnyItemOrThrow(itemId);
        List<ItemAsset> scope = assetScope(item, sizeId);
        ItemAsset asset = ItemAsset.builder()
            .item(item)
            .itemSize(sizeId == null ? null : findSizeOrThrow(item, sizeId))
            .imageUrl(res.url())
            .imageId(res.imageId())
            .resourceType(resourceType)
            .sortOrder(scope.size())
            .build();
        scope.add(asset);
        itemRepository.save(item);
        log.info("added {} asset to item #{} ({}){}", resourceType, itemId, displayName(item),
                 sizeId == null ? "" : " size #" + sizeId);
        return toItemView(item);
    }

    public ItemView addAsset(Long itemId, CloudinaryResponse res, String resourceType) {
        return addAsset(itemId, null, res, resourceType);
    }

    /** Media picked from the existing Cloudinary library — never ours to delete. */
    @Transactional
    public ItemView pickAsset(Long itemId, Long sizeId, PickMediaRequest req) {
        Item item = findAnyItemOrThrow(itemId);
        List<ItemAsset> scope = assetScope(item, sizeId);
        ItemAsset asset = ItemAsset.builder()
            .item(item)
            .itemSize(sizeId == null ? null : findSizeOrThrow(item, sizeId))
            .imageUrl(req.secureUrl())
            .imageId(req.publicId())
            .resourceType(req.resourceType())
            .sortOrder(scope.size())
            .owned(false)
            .build();
        scope.add(asset);
        Item saved = itemRepository.saveAndFlush(item);
        log.info("picked {} asset '{}' for item #{} ({}){}", req.resourceType(), req.publicId(), itemId,
                 displayName(saved), sizeId == null ? "" : " size #" + sizeId);
        return toItemView(saved);
    }

    public ItemView pickAsset(Long itemId, PickMediaRequest req) {
        return pickAsset(itemId, null, req);
    }

    /** Deletes an asset from whichever gallery of the item holds it. */
    @Transactional
    public ItemView deleteAsset(Long itemId, Long assetId) {
        Item item = findAnyItemOrThrow(itemId);
        List<ItemAsset> scope = owningScope(item, assetId);
        ItemAsset asset = scope.stream()
            .filter(a -> a.getId().equals(assetId))
            .findFirst()
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "ASSET_NOT_FOUND"));
        scope.remove(asset);
        resequence(scope);
        itemRepository.saveAndFlush(item);
        deleteFilesNoLongerUsed(item, List.of(asset));
        log.info("deleted asset #{} from item #{} ({})", assetId, itemId, displayName(item));
        return toItemView(item);
    }

    /**
     * Move an asset one slot towards the front ({@code delta} −1) or back (+1) of
     * its own gallery. Mirrors {@link #moveSize}; a move past either end is a no-op.
     */
    @Transactional
    public ItemView moveAsset(Long itemId, Long assetId, int delta) {
        Item item = findAnyItemOrThrow(itemId);
        List<ItemAsset> scope = owningScope(item, assetId);
        int idx = 0;
        while (!scope.get(idx).getId().equals(assetId)) idx++;
        int target = idx + delta;
        if (target >= 0 && target < scope.size()) {
            Collections.swap(scope, idx, target);
            resequence(scope);
            itemRepository.save(item);
            log.info("moved asset #{} of item #{} from position {} to {}", assetId, itemId, idx, target);
        }
        return toItemView(item);
    }

    /**
     * Give {@code sizeId} its own copy of an asset the item already has (or, with a
     * null {@code sizeId}, copy one of a size's into the shared gallery). The source
     * keeps its image — removing it is the separate delete action — so the copy is a
     * second row over the same Cloudinary file, and the two are only distinguishable
     * by which gallery holds them. {@link #deleteAsset} counts those references
     * before dropping the file, which is why {@code owned} is inherited rather than
     * forced to false: whichever copy is deleted last takes the file with it.
     */
    @Transactional
    public ItemView copyAsset(Long itemId, Long assetId, Long sizeId) {
        Item item = findAnyItemOrThrow(itemId);
        ItemAsset source = owningScope(item, assetId).stream()
            .filter(a -> a.getId().equals(assetId))
            .findFirst()
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "ASSET_NOT_FOUND"));
        List<ItemAsset> scope = assetScope(item, sizeId);
        ItemAsset copy = ItemAsset.builder()
            .item(item)
            .itemSize(sizeId == null ? null : findSizeOrThrow(item, sizeId))
            .imageUrl(source.getImageUrl())
            .imageId(source.getImageId())
            .resourceType(source.getResourceType())
            .sortOrder(scope.size())
            .owned(source.isOwned())
            .build();
        scope.add(copy);
        itemRepository.save(item);
        log.info("copied asset #{} of item #{} to {}", assetId, itemId,
                 sizeId == null ? "the item" : "size #" + sizeId);
        return toItemView(item);
    }

    // ── Sizes ───────────────────────────────────────────────────────────────

    /**
     * Append one or more sizes. When adding the first size(s) the admin also
     * submits a size representing the item's original configuration, so an item
     * with sizes always has its original captured as a named size.
     */
    @Transactional
    public ItemView addSizes(Long itemId, List<ItemSizeRequest> reqs) {
        Item item = findAnyItemOrThrow(itemId);
        int nextOrder = item.getSizes().size();
        reqs.forEach(ItemService::requireSizeName);
        for (ItemSizeRequest req : reqs) {
            ItemSize size = ItemSize.builder()
                .item(item)
                .sizeEn(req.sizeEn())
                .sizeFr(req.sizeFr())
                .sizeEs(req.sizeEs())
                .stock(req.stock())
                .weightGrams(req.weightGrams())
                .price(resolveSizePrice(item, req))
                .pricingWork(req.pricingWork() == null ? null : BigDecimal.valueOf(req.pricingWork()))
                .descriptionEn(req.descriptionEn())
                .descriptionFr(req.descriptionFr())
                .descriptionEs(req.descriptionEs())
                .sortOrder(nextOrder++)
                .build();
            item.getSizes().add(size);
        }
        itemRepository.save(item);
        log.info("added {} size(s) to item #{} ({})", reqs.size(), itemId, displayName(item));
        return toItemView(item);
    }

    @Transactional
    public ItemView updateSize(Long itemId, Long sizeId, ItemSizeRequest req) {
        Item item = findAnyItemOrThrow(itemId);
        ItemSize size = findSizeOrThrow(item, sizeId);
        requireSizeName(req);
        size.setSizeEn(req.sizeEn());
        size.setSizeFr(req.sizeFr());
        size.setSizeEs(req.sizeEs());
        // Stock intentionally not written here — see updateItem. Managed via
        // adjustSizeStock / setSizeStock only.
        size.setWeightGrams(req.weightGrams());
        size.setPricingWork(req.pricingWork() == null ? null : BigDecimal.valueOf(req.pricingWork()));
        size.setPrice(resolveSizePrice(item, req));
        size.setDescriptionEn(req.descriptionEn());
        size.setDescriptionFr(req.descriptionFr());
        size.setDescriptionEs(req.descriptionEs());
        itemRepository.save(item);
        log.info("updated size #{} of item #{}", sizeId, itemId);
        return toItemView(item);
    }

    /**
     * A size must be named in at least one language. Bean validation cannot carry this:
     * the bulk add takes a {@code List<ItemSizeRequest>}, and {@code @Valid} on a list
     * body does not cascade to its elements — so the check lives here, where both the
     * bulk add and the single update go through it.
     */
    private static void requireSizeName(ItemSizeRequest req) {
        boolean named = Stream.of(req.sizeEn(), req.sizeFr(), req.sizeEs())
                .anyMatch(v -> v != null && !v.isBlank());
        if (!named) throw new AppException(HttpStatus.BAD_REQUEST, "SIZE_NAME_REQUIRED");
    }

    // ── Stock ─────────────────────────────────────────────────────────────────
    // Stock is managed separately from the general item/size edit so that (a) an
    // unrelated edit can never clobber it and (b) concurrent checkout decrements
    // are never lost. Delta ops are atomic; absolute sets use an optimistic guard.

    /** Apply a relative change (+restock / −correction) atomically. */
    @Transactional
    public ItemView adjustStock(Long id, int delta) {
        findAnyItemOrThrow(id);
        if (itemRepository.adjustStock(id, delta) == 0) {
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "STOCK_NEGATIVE");
        }
        log.info("adjusted stock of item #{} by {}", id, delta);
        return toItemView(findAnyItemOrThrow(id));
    }

    /** Set absolute stock, rejecting if a sale changed it since {@code expectedVersion}. */
    @Transactional
    public ItemView setStock(Long id, int stock, long expectedVersion) {
        if (stock < 0) throw new AppException(HttpStatus.BAD_REQUEST, "STOCK_NEGATIVE");
        findAnyItemOrThrow(id);
        if (itemRepository.setStockIfVersion(id, stock, expectedVersion) == 0) {
            throw new AppException(HttpStatus.CONFLICT, "STOCK_VERSION_CONFLICT");
        }
        log.info("set stock of item #{} to {}", id, stock);
        return toItemView(findAnyItemOrThrow(id));
    }

    @Transactional
    public ItemView adjustSizeStock(Long itemId, Long sizeId, int delta) {
        Item item = findAnyItemOrThrow(itemId);
        findSizeOrThrow(item, sizeId); // 404 if the size isn't on this item
        if (itemRepository.adjustSizeStock(sizeId, delta) == 0) {
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "STOCK_NEGATIVE");
        }
        log.info("adjusted stock of size #{} (item #{}) by {}", sizeId, itemId, delta);
        return toItemView(findAnyItemOrThrow(itemId));
    }

    @Transactional
    public ItemView setSizeStock(Long itemId, Long sizeId, int stock, long expectedVersion) {
        if (stock < 0) throw new AppException(HttpStatus.BAD_REQUEST, "STOCK_NEGATIVE");
        Item item = findAnyItemOrThrow(itemId);
        findSizeOrThrow(item, sizeId);
        if (itemRepository.setSizeStockIfVersion(sizeId, stock, expectedVersion) == 0) {
            throw new AppException(HttpStatus.CONFLICT, "STOCK_VERSION_CONFLICT");
        }
        log.info("set stock of size #{} (item #{}) to {}", sizeId, itemId, stock);
        return toItemView(findAnyItemOrThrow(itemId));
    }

    @Transactional
    public ItemView deleteSize(Long itemId, Long sizeId) {
        Item item = findAnyItemOrThrow(itemId);
        ItemSize size = findSizeOrThrow(item, sizeId);
        // Media scoped to this size goes with it; the item's shared gallery, which
        // the size may only have been borrowing, is untouched.
        List<ItemAsset> assets = List.copyOf(size.getAssets());
        item.getSizes().remove(size);
        for (int i = 0; i < item.getSizes().size(); i++) {
            item.getSizes().get(i).setSortOrder(i);
        }
        itemRepository.saveAndFlush(item);
        deleteFilesNoLongerUsed(item, assets);
        log.info("deleted size #{} from item #{}", sizeId, itemId);
        return toItemView(item);
    }

    /**
     * Move a size one slot towards the front ({@code delta} −1) or the back (+1)
     * of the item's size list. A move past either end is a no-op.
     */
    @Transactional
    public ItemView moveSize(Long itemId, Long sizeId, int delta) {
        Item item = findAnyItemOrThrow(itemId);
        List<ItemSize> sizes = item.getSizes();
        int idx = sizes.indexOf(findSizeOrThrow(item, sizeId));
        int target = idx + delta;
        if (target >= 0 && target < sizes.size()) {
            Collections.swap(sizes, idx, target);
            for (int i = 0; i < sizes.size(); i++) {
                sizes.get(i).setSortOrder(i);
            }
            itemRepository.save(item);
            log.info("moved size #{} of item #{} from position {} to {}", sizeId, itemId, idx, target);
        }
        return toItemView(item);
    }

    private ItemSize findSizeOrThrow(Item item, Long sizeId) {
        return item.getSizes().stream()
            .filter(s -> s.getId().equals(sizeId))
            .findFirst()
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "SIZE_NOT_FOUND"));
    }

    public void deactivate(Long id) {
        Item item = findAnyItemOrThrow(id);
        item.setActive(false);
        itemRepository.save(item);
        log.info("deactivated {} from the database", displayName(item));
    }

    public void activate(Long id) {
        Item item = findAnyItemOrThrow(id);
        item.setActive(true);
        itemRepository.save(item);
        log.info("activated {} from the database", displayName(item));
    }

    @Transactional
    public void delete(Long id) {
        Item item = findAnyItemOrThrow(id);
        if (orderRepository.existsByOrderItems_Item_Id(id)) {
            throw new AppException(HttpStatus.CONFLICT, "ITEM_HAS_ORDERS");
        }
        // Distinct files only — an image copied onto a size appears more than once.
        List<ItemAsset> assets = List.copyOf(allAssets(item).stream()
            .collect(java.util.stream.Collectors.toMap(ItemAsset::getImageId, a -> a, (first, dup) -> first))
            .values());
        itemRepository.delete(item);
        itemRepository.flush();
        for (ItemAsset asset : assets) {
            cloudinaryService.delete(asset.getImageId(), asset.getResourceType());
        }
        log.info("deleted {} from the database", displayName(item));
    }

    public List<ItemViewVerbose> getItemsVerbose() {
        return itemRepository.findAll().stream()
            .map(this::toItemViewVerbose)
            .toList();
    }

    // public facing functions

    public ItemView getItem(Long id) {
        return toItemView(findItemOrThrow(id));
    }

    public List<ItemView> getItemsByCategory(Long categoryId) {
        Category category = resolveCategory(categoryId);
        return itemRepository.findByCategoriesAndActiveTrue(category)
            .stream()
            .map(this::toItemView)
            .toList();
    }

    public List<ItemView> getItemsByLabel(Long labelId) {
        return itemRepository.findByLabels_IdAndActiveTrue(labelId)
            .stream()
            .map(this::toItemView)
            .toList();
    }

    public List<ItemView> getAllItems() {
        return itemRepository.findByActiveTrue().stream()
            .map(this::toItemView)
            .toList();
    }

    public List<ItemView> getAllItemsSortedBySalesVolume() {
        return itemRepository.findByActiveTrue().stream()
            .sorted(Comparator.comparing(Item::getTotalSales).reversed())
            .map(this::toItemView)
            .toList();
    }

    public SalesStats getSalesStats() {
        RevenueStats rev = itemRepository.getRevenueTotals();
        LocalDateTime now = LocalDateTime.now();
        return new SalesStats(
            rev.total(),
            rev.week(),
            rev.month(),
            rev.quarter(),
            rev.year(),
            orderRepository.countSuccessful(),
            orderRepository.countSuccessfulSince(now.minusWeeks(1)),
            orderRepository.countSuccessfulSince(now.minusMonths(1)),
            orderRepository.countSuccessfulSince(now.minusMonths(3)),
            orderRepository.countSuccessfulSince(now.minusYears(1)),
            orderRepository.sumTaxTotal(),
            orderRepository.sumTaxSince(now.minusWeeks(1)),
            orderRepository.sumTaxSince(now.minusMonths(1)),
            orderRepository.sumTaxSince(now.minusMonths(3)),
            orderRepository.sumTaxSince(now.minusYears(1))
        );
    }

    public MaterialSalesStats getMaterialSalesStats() {
        MaterialBucket gold10k = MaterialBucket.zero();
        MaterialBucket gold14k = MaterialBucket.zero();
        MaterialBucket silver  = MaterialBucket.zero();
        MaterialBucket steel   = MaterialBucket.zero();
        MaterialBucket other   = MaterialBucket.zero();

        for (Object[] row : orderRepository.materialSalesTotals()) {
            JewelryMaterial material = (JewelryMaterial) row[0];
            PricingFormula formula   = (PricingFormula) row[1];
            // SUM over a float column comes back as Double; money is BigDecimal.
            BigDecimal grams = BigDecimal.valueOf(((Number) row[2]).doubleValue());
            BigDecimal money = (BigDecimal) row[3];
            long units       = ((Number) row[4]).longValue();

            if (formula == PricingFormula.GOLD_10K) {
                gold10k = gold10k.plus(grams, money, units);
            } else if (formula == PricingFormula.GOLD_14K) {
                gold14k = gold14k.plus(grams, money, units);
            } else if (material == JewelryMaterial.SILVER) {
                silver = silver.plus(grams, money, units);
            } else if (material == JewelryMaterial.STEEL) {
                steel = steel.plus(grams, money, units);
            } else {
                other = other.plus(grams, money, units);
            }
        }
        return new MaterialSalesStats(gold10k, gold14k, silver, steel, other);
    }

    public List<ItemView> getMonthTrendingItems() {
        return itemRepository.findByActiveTrue().stream()
            .sorted(Comparator.comparing(Item::getNbSoldMonth).reversed())
            .map(this::toItemView)
            .toList();
    }

    private Item findItemOrThrow(Long id) {
        return itemRepository.findByIdAndActiveTrue(id)
            .orElseThrow(() -> {
                log.warn("item with id {} does not exist", id);
                return new AppException(HttpStatus.NOT_FOUND, "ITEM_NOT_FOUND");
            });
    }

    private Item findAnyItemOrThrow(Long id) {
        return itemRepository.findById(id)
            .orElseThrow(() -> {
                log.warn("item with id {} does not exist", id);
                return new AppException(HttpStatus.NOT_FOUND, "ITEM_NOT_FOUND");
            });
    }
}
