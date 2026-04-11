package com.bijou.backend.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bijou.backend.entities.CollectionTheme;

public interface CollectionThemeRepository extends JpaRepository<CollectionTheme, Long> {
    Optional<CollectionTheme> findByCollection_Id(Long collectionId);
    void deleteByCollection_Id(Long collectionId);
}
