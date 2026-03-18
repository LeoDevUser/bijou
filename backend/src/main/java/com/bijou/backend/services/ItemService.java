package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.bijou.backend.entities.Category;
import com.bijou.backend.entities.Item;
import com.bijou.backend.repositories.ItemRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ItemService {

    private final ItemRepository itemRepository;
    /*
     *Admin Functions
     * */

    private ItemView toItemView(Item item) {
        return new ItemView(item.getId(), item.getStock(), item.getName(), item.getPrice(), item.getLabels(), item.getCategory(), item.getImageUrl());
    }
    
    public ItemView createItem(ItemRequest req) {
        if (itemRepository.findByNameIgnoreCase(req.name()).isPresent()) {
            log.warn("item with name {} already exists", req.name());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "item with this name already exists");
        }
        Item item = Item.builder()
            .stock(req.stock())
            .price(BigDecimal.valueOf(req.price()))
            .name(req.name())
            .labels(req.labels())
            .category(req.category())
            .build();
        itemRepository.save(item);
        return toItemView(item);
    }

    public ItemView updateItem(Long id, ItemRequest req) {
        Item item = findItemOrThrow(id);
        item.setName(req.name());
        item.setStock(req.stock());
        item.setPrice(BigDecimal.valueOf(req.price()));
        item.setLabels(req.labels());
        item.setCategory(req.category());
        itemRepository.save(item);
        return toItemView(item);
    }

    public void deleteItem(Long id) {
        Item item = findItemOrThrow(id);
        item.setActive(false);
        itemRepository.save(item);
        //itemRepository.deleteById(id);
        log.info("deleted {} from the databse", item.getName());
    }

    //public facing Functions

    public ItemView getItem(Long id) {
        return toItemView(findItemOrThrow(id));
    }

    public List<ItemView> getItemsByCategory(Category category) {
        return itemRepository.findByCategoryAndActiveTrue(category)
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
            return new ResponseStatusException(HttpStatus.NOT_FOUND, "item not found");
        });
    }
}
