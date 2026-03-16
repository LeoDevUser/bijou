package com.bijou.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.Category;
import com.bijou.backend.entities.Item;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long>{
    Optional<Item> findByNameIgnoreCase(String name);
    List<Item> findByCategory(Category category);
    List<Item> findByCategoryAndActiveTrue(Category category);
    List<Item> findByActiveTrue();
    Optional<Item> findByIdAndActiveTrue(Long id);
}
