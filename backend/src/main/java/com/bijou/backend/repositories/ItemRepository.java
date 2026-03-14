package com.bijou.backend.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.Item;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long>{
    Optional<Item> findByNameIgnoreCase(String name);
}
