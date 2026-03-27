package com.bijou.backend.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.Label;

@Repository
public interface LabelRepository extends JpaRepository<Label, Long> {
    Optional<Label> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
