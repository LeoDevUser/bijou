package com.bijou.backend.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bijou.backend.entities.CollectionSiteAsset;

public interface CollectionSiteAssetRepository extends JpaRepository<CollectionSiteAsset, Long> {
    Optional<CollectionSiteAsset> findByCollection_IdAndSlot(Long collectionId, String slot);
}
