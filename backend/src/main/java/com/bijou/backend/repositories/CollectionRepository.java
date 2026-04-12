package com.bijou.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bijou.backend.entities.Collection;

public interface CollectionRepository extends JpaRepository<Collection, Long> {
    List<Collection> findAllByOrderByIdAsc();
    List<Collection> findByActiveTrueOrderByIdAsc();
    java.util.Optional<Collection> findByIsMainTrue();
    List<Collection> findByLabels_Id(Long labelId);
}
