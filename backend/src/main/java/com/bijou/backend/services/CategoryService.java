package com.bijou.backend.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Category;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.CategoryRepository;
import com.bijou.backend.repositories.ItemRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ItemRepository itemRepository;

    public static CategoryView toView(Category c) {
        return new CategoryView(c.getId(), c.getNameEn(), c.getNameFr(), c.getNameEs());
    }

    public List<CategoryView> getAll() {
        return categoryRepository.findAll().stream().map(CategoryService::toView).toList();
    }

    public CategoryView create(CategoryRequest req) {
        Category category = categoryRepository.save(
            Category.builder()
                .nameEn(req.nameEn())
                .nameFr(req.nameFr())
                .nameEs(req.nameEs())
                .build()
        );
        log.info("created category #{} ({})", category.getId(), category.getNameEn());
        return toView(category);
    }

    @Transactional
    public void delete(Long id) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND"));
        if (!itemRepository.findByCategory(category).isEmpty()) {
            throw new AppException(HttpStatus.CONFLICT, "CATEGORY_HAS_ITEMS");
        }
        categoryRepository.deleteById(id);
        log.info("deleted category #{} ({})", id, category.getNameEn());
    }
}
