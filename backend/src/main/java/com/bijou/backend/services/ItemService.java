package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Category;
import com.bijou.backend.entities.Label;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.entities.Item;
import com.bijou.backend.repositories.ItemRepository;
import com.bijou.backend.repositories.LabelRepository;

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
        return labels.stream().map(l -> new LabelView(l.getId(), l.getName())).toList();
    }

    private List<Label> resolveLabels(List<Long> labelIds) {
        if (labelIds == null || labelIds.isEmpty()) return List.of();
        return labelRepository.findAllById(labelIds);
    }

    private ItemView toItemView(Item item) {
        return new ItemView(
                item.getId(), item.getStock(), item.getName(),
                item.getPrice(), toLabelViews(item.getLabels()), item.getCategory(),
                item.getDescription(), item.getImageUrl(), item.getImageId()
            );
    }

    private ItemViewVerbose toItemViewVerbose(Item item) {
        return new ItemViewVerbose(
                item.getId(), item.getStock(), item.getName(),
                item.getPrice(), toLabelViews(item.getLabels()), item.getCategory(),
                item.getDescription(), item.getImageUrl(), item.getImageId(),
                item.getNbSold(), item.getTotalSales(), item.isActive()
            );
    }

    public ItemView createItem(ItemRequest req) {
        if (itemRepository.findByNameIgnoreCase(req.name()).isPresent()) {
            log.warn("item with name {} already exists", req.name());
            throw new AppException(HttpStatus.CONFLICT, "ITEM_NAME_CONFLICT", req.name());
        }
        Item item = Item.builder()
            .stock(req.stock())
            .price(BigDecimal.valueOf(req.price()))
            .name(req.name())
            .labels(resolveLabels(req.labelIds()))
            .category(req.category())
            .description(req.description())
            .build();
        itemRepository.save(item);
        return toItemView(item);
    }

    public ItemView updateItem(Long id, ItemRequest req) {
        Item item = findItemOrThrow(id);
        item.setName(req.name());
        item.setStock(req.stock());
        item.setPrice(BigDecimal.valueOf(req.price()));
        item.setLabels(resolveLabels(req.labelIds()));
        item.setCategory(req.category());
        itemRepository.save(item);
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
        return toItemView(item);
    }

    public void deactivate(Long id) {
        Item item = findAnyItemOrThrow(id);
        item.setActive(false);
        itemRepository.save(item);
        log.info("deactivated {} from the databse", item.getName());
    }

    public void activate(Long id) {
        Item item = findAnyItemOrThrow(id);
        item.setActive(true);
        itemRepository.save(item);
        log.info("activated {} from the databse", item.getName());
    }

    public void delete(Long id) {
        Item item = findAnyItemOrThrow(id);
        if (item.getImageId() != null && !item.getImageId().isEmpty()) deleteImage(id);
        itemRepository.deleteById(id);
        log.info("deleted {} from the databse", item.getName());
    }

    public List<ItemViewVerbose> getItemsVerbose() {
        return itemRepository.findAll().stream()
            .map(item -> toItemViewVerbose(item))
            .toList();
    }

    // public facing functions

    public ItemView getItem(Long id) {
        return toItemView(findItemOrThrow(id));
    }

    public List<ItemView> getItemsByCategory(Category category) {
        return itemRepository.findByCategoryAndActiveTrue(category)
            .stream()
            .map(item -> toItemView(item))
            .toList();
    }

    public List<ItemView> getItemsByLabel(String name) {
        return itemRepository.findByLabels_NameIgnoreCaseAndActiveTrue(name)
            .stream()
            .map(item -> toItemView(item))
            .toList();
    }

    public List<ItemView> getAllItems() {
        return itemRepository.findByActiveTrue().stream()
            .map(item -> toItemView(item))
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
