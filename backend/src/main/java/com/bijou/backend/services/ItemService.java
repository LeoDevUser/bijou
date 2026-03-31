package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Category;
import com.bijou.backend.entities.Label;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.entities.Item;
import com.bijou.backend.repositories.ItemRepository;
import com.bijou.backend.repositories.LabelRepository;
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

    private List<LabelView> toLabelViews(List<Label> labels) {
        if (labels == null) return List.of();
        return labels.stream().map(LabelService::toView).toList();
    }

    private List<Label> resolveLabels(List<Long> labelIds) {
        if (labelIds == null || labelIds.isEmpty()) return List.of();
        return labelRepository.findAllById(labelIds);
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
                item.getPrice(), toLabelViews(item.getLabels()), item.getCategory(),
                item.getDescriptionEn(), item.getDescriptionFr(), item.getDescriptionEs(),
                item.getImageUrl(), item.getImageId(),
                item.getDiscountPercent()
            );
    }

    private ItemViewVerbose toItemViewVerbose(Item item) {
        return new ItemViewVerbose(
                item.getId(), item.getStock(),
                item.getNameEn(), item.getNameFr(), item.getNameEs(),
                item.getPrice(), toLabelViews(item.getLabels()), item.getCategory(),
                item.getDescriptionEn(), item.getDescriptionFr(), item.getDescriptionEs(),
                item.getImageUrl(), item.getImageId(),
                item.getNbSold(), item.getNbSoldMonth(), item.getTotalSales(),
                item.getTotalSalesWeek(), item.getTotalSalesMonth(), item.getTotalSalesQuarter(),
                item.getTotalSalesYear(), item.isActive(),
                item.getDiscountPercent()
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
            .category(req.category())
            .descriptionEn(req.descriptionEn())
            .descriptionFr(req.descriptionFr())
            .descriptionEs(req.descriptionEs())
            .discountPercent(req.discountPercent())
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
        item.setCategory(req.category());
        item.setDescriptionEn(req.descriptionEn());
        item.setDescriptionFr(req.descriptionFr());
        item.setDescriptionEs(req.descriptionEs());
        item.setDiscountPercent(req.discountPercent());
        itemRepository.save(item);
        log.info("updated item #{} ({})", id, displayName(item));
        return toItemView(item);
    }

    public ItemView updateItemImage(Long id, CloudinaryResponse res) {
        Item item = findItemOrThrow(id);
        if (item.getImageId() != null && !item.getImageId().isEmpty()) {
            cloudinaryService.delete(item.getImageId());
        }
        item.setImageUrl(res.url());
        item.setImageId(res.imageId());
        itemRepository.save(item);
        log.info("updated image for item #{} ({})", id, displayName(item));
        return toItemView(item);
    }

    public ItemView deleteImage(Long id) {
        Item item = findItemOrThrow(id);
        if (item.getImageId() != null && !item.getImageId().isEmpty()) {
            cloudinaryService.delete(item.getImageId());
        }
        item.setImageUrl("");
        item.setImageId("");
        itemRepository.save(item);
        log.info("deleted image for item #{} ({})", id, displayName(item));
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

    public void delete(Long id) {
        Item item = findAnyItemOrThrow(id);
        if (item.getImageId() != null && !item.getImageId().isEmpty()) deleteImage(id);
        itemRepository.deleteById(id);
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

    public List<ItemView> getItemsByCategory(Category category) {
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

    public SalesStats getSalesStats(){
        return itemRepository.getCombinedSalesStats();
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
