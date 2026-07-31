package com.bijou.backend.services;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Category;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.CategoryRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;

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
    public CategoryView update(Long id, CategoryRequest req) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND"));
        // nameEn backs the NOT NULL column — reject a blank rename with a clean
        // error instead of letting it surface as a constraint violation.
        if (req.nameEn() == null || req.nameEn().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "CATEGORY_NAME_REQUIRED");
        }
        // Renaming only — the id is untouched, so items keep their assignment.
        category.setNameEn(req.nameEn());
        category.setNameFr(req.nameFr());
        category.setNameEs(req.nameEs());
        categoryRepository.save(category);
        log.info("updated category #{} ({})", id, category.getNameEn());
        return toView(category);
    }

    @Transactional
    public void delete(Long id) {
        Category category = categoryRepository.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND"));
        // Rely on the FK constraint rather than a pre-check to avoid TOCTOU:
        // items could be assigned to this category between the check and the delete.
        try {
            categoryRepository.delete(category);
            categoryRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new AppException(HttpStatus.CONFLICT, "CATEGORY_HAS_ITEMS");
        }
        log.info("deleted category #{} ({})", id, category.getNameEn());
    }
}
