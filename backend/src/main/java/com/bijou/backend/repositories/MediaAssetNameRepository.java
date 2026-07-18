package com.bijou.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.MediaAssetName;

@Repository
public interface MediaAssetNameRepository extends JpaRepository<MediaAssetName, Long> {
    Optional<MediaAssetName> findByPublicIdAndResourceType(String publicId, String resourceType);
    List<MediaAssetName> findByResourceTypeAndPublicIdIn(String resourceType, List<String> publicIds);
}
