package com.bijou.backend.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.bijou.backend.entities.Collection;

import jakarta.persistence.LockModeType;

public interface CollectionRepository extends JpaRepository<Collection, Long> {
    List<Collection> findAllByOrderByIdAsc();
    List<Collection> findByActiveTrueOrderByIdAsc();
    Optional<Collection> findByIsMainTrue();
    List<Collection> findByLabels_Id(Long labelId);
    boolean existsByImageIdAndIdNot(String imageId, Long excludeId);
    boolean existsByImageId(String imageId);

    /** Acquires a pessimistic write lock on the current main collection. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Collection c WHERE c.isMain = true")
    Optional<Collection> findByIsMainTrueWithLock();

    /** Acquires a pessimistic write lock on a single collection by id. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Collection c WHERE c.id = :id")
    Optional<Collection> findByIdWithLock(@Param("id") Long id);

    /** Atomically detaches a label from all collections (junction table only). */
    @Modifying
    @Query(value = "DELETE FROM collection_labels WHERE label_id = :labelId", nativeQuery = true)
    void detachLabel(@Param("labelId") Long labelId);
}
