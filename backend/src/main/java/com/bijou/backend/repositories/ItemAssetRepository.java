package com.bijou.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.ItemAsset;

@Repository
public interface ItemAssetRepository extends JpaRepository<ItemAsset, Long> {}
