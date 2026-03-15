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

    public void createItem(int stock, float price, String name, List<String> labels, Category category) {
        if (itemRepository.findByNameIgnoreCase(name).isPresent()) {
            log.warn("item with name {} already exists", name);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "item with this name already exists");
        }
        Item item = Item.builder()
            .stock(stock)
            .price(BigDecimal.valueOf(price))
            .name(name)
            .labels(labels)
            .category(category)
            .build();
        itemRepository.save(item);
    }

    public void updateItem(Long id ,int stock, float price, String name, List<String> labels, Category category) {
        Item item = findItemOrThrow(id);
        item.setName(name);
        item.setStock(stock);
        item.setPrice(BigDecimal.valueOf(price));
        item.setLabels(labels);
        item.setCategory(category);
        itemRepository.save(item);
    }

    public void deleteItem(Long id) {
        Item item = findItemOrThrow(id);
        itemRepository.deleteById(id);
        log.info("deleted {} from the databse", item.getName());
    }

    //public facing Functions
    public Item getItem(Long id) {
        return findItemOrThrow(id);
    }

    public List<Item> getItemsByCategory(Category category) {
        return itemRepository.findByCategory(category);
    }

    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    private Item findItemOrThrow(Long id) {
    return itemRepository.findById(id)
        .orElseThrow(() -> {
            log.warn("item with id {} does not exist", id);
            return new ResponseStatusException(HttpStatus.NOT_FOUND, "item not found");
        });
    }
}
