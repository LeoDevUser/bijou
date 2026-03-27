package com.bijou.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.SiteAsset;

@Repository
public interface SiteAssetRepository extends JpaRepository<SiteAsset, Long> {
    Optional<SiteAsset> findBySlot(String slot);
    List<SiteAsset> findAllByOrderByIdAsc();
}
