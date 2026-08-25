package com.bijou.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.ItemAsset;
import com.bijou.backend.entities.ItemSize;

@Repository
public interface ItemAssetRepository extends JpaRepository<ItemAsset, Long> {
    /**
     * Re-points an asset at a size (or back at the item, with a null {@code size}).
     * Done as a query rather than by moving the entity between the two collections:
     * both declare {@code orphanRemoval}, so removing it from its current one would
     * delete the row instead of moving it. Clears the persistence context so the
     * caller re-reads both scopes fresh and can resequence them.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ItemAsset a SET a.itemSize = :size WHERE a.id = :id")
    int reassign(@Param("id") Long id, @Param("size") ItemSize size);
}
