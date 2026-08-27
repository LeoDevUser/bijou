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
    List<Collection> findByParent_Id(Long parentId);

    // sortOrder is null on rows created before the column existed, and Postgres sorts
    // nulls last in ASC — coalesce so those keep sorting ahead of explicitly ordered ones.
    @Query("SELECT c FROM Collection c ORDER BY COALESCE(c.sortOrder, 0) ASC, c.id ASC")
    List<Collection> findAllOrdered();

    @Query("SELECT c FROM Collection c WHERE c.active = true ORDER BY COALESCE(c.sortOrder, 0) ASC, c.id ASC")
    List<Collection> findActiveOrdered();

    @Query("SELECT c FROM Collection c WHERE c.parent.id = :parentId AND c.active = true "
            + "ORDER BY COALESCE(c.sortOrder, 0) ASC, c.id ASC")
    List<Collection> findActiveChildren(@Param("parentId") Long parentId);
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
