package com.bijou.backend.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;

import com.bijou.backend.entities.Category;
import com.bijou.backend.entities.Item;
import com.bijou.backend.entities.ItemAsset;
import com.bijou.backend.entities.Label;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.CategoryRepository;
import com.bijou.backend.repositories.ItemRepository;
import com.bijou.backend.repositories.LabelRepository;
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

    private List<Label> resolveLabels(List<Long> labelIds) {
        if (labelIds == null || labelIds.isEmpty()) return List.of();
        return labelRepository.findAllById(labelIds);
    }

    private Category resolveCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND"));
    }

    private String displayName(Item item) {
        if (item.getNameEn() != null) return item.getNameEn();
        if (item.getNameFr() != null) return item.getNameFr();
        return item.getNameEs() != null ? item.getNameEs() : String.valueOf(item.getId());
    }

    private ItemView toItemView(Item item) {
        return new ItemView(
                item.getId(), item.getStock(),
                item.getNameEn(), item.getNameFr(), item.getNameEs(),
                item.getPrice(), toLabelViews(item.getLabels()), CategoryService.toView(item.getCategory()),
                item.getDescriptionEn(), item.getDescriptionFr(), item.getDescriptionEs(),
                toAssetViews(item.getAssets()),
                item.getDiscountPercent(),
                item.getMaterial(),
                item.isUsmcaQualified(),
                item.getWeightGrams()
            );
    }

    private ItemViewVerbose toItemViewVerbose(Item item) {
        return new ItemViewVerbose(
                item.getId(), item.getStock(),
                item.getNameEn(), item.getNameFr(), item.getNameEs(),
                item.getPrice(), toLabelViews(item.getLabels()), CategoryService.toView(item.getCategory()),
                item.getDescriptionEn(), item.getDescriptionFr(), item.getDescriptionEs(),
                toAssetViews(item.getAssets()),
                item.getNbSold(), item.getNbSoldMonth(), item.getTotalSales(),
                item.getTotalSalesWeek(), item.getTotalSalesMonth(), item.getTotalSalesQuarter(),
                item.getTotalSalesYear(), item.isActive(),
                item.getDiscountPercent(),
                item.getMaterial(),
                item.isUsmcaQualified(),
                item.getWeightGrams()
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
            .price(BigDecimal.valueOf(req.price()))
            .nameEn(req.nameEn())
            .nameFr(req.nameFr())
            .nameEs(req.nameEs())
            .labels(resolveLabels(req.labelIds()))
            .category(resolveCategory(req.categoryId()))
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
        item.setStock(req.stock());
        item.setPrice(BigDecimal.valueOf(req.price()));
        item.setLabels(resolveLabels(req.labelIds()));
        item.setCategory(resolveCategory(req.categoryId()));
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

    @Transactional
    public ItemView addAsset(Long itemId, CloudinaryResponse res, String resourceType) {
        Item item = findAnyItemOrThrow(itemId);
        int nextOrder = item.getAssets().size();
        ItemAsset asset = ItemAsset.builder()
            .item(item)
            .imageUrl(res.url())
            .imageId(res.imageId())
            .resourceType(resourceType)
            .sortOrder(nextOrder)
            .build();
        item.getAssets().add(asset);
        itemRepository.save(item);
        log.info("added {} asset to item #{} ({})", resourceType, itemId, displayName(item));
        return toItemView(item);
    }

    public ItemView pickAsset(Long itemId, PickMediaRequest req) {
        Item item = findAnyItemOrThrow(itemId);
        int nextOrder = item.getAssets().size();
        ItemAsset asset = ItemAsset.builder()
            .item(item)
            .imageUrl(req.secureUrl())
            .imageId(req.publicId())
            .resourceType(req.resourceType())
            .sortOrder(nextOrder)
            .owned(false)
            .build();
        item.getAssets().add(asset);
        Item saved = itemRepository.saveAndFlush(item);
        log.info("picked {} asset '{}' for item #{} ({})", req.resourceType(), req.publicId(), itemId, displayName(saved));
        return toItemView(saved);
    }

    @Transactional
    public ItemView deleteAsset(Long itemId, Long assetId) {
        Item item = findAnyItemOrThrow(itemId);
        ItemAsset asset = item.getAssets().stream()
            .filter(a -> a.getId().equals(assetId))
            .findFirst()
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "ASSET_NOT_FOUND"));
        item.getAssets().remove(asset);
        for (int i = 0; i < item.getAssets().size(); i++) {
            item.getAssets().get(i).setSortOrder(i);
        }
        itemRepository.saveAndFlush(item);
        if (asset.isOwned()) {
            cloudinaryService.delete(asset.getImageId(), asset.getResourceType());
        }
        log.info("deleted asset #{} from item #{} ({})", assetId, itemId, displayName(item));
        return toItemView(item);
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
        List<ItemAsset> assets = List.copyOf(item.getAssets());
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
        return itemRepository.findByCategoryAndActiveTrue(category)
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
