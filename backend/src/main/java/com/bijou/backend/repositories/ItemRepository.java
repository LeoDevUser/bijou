package com.bijou.backend.repositories;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.Category;
import com.bijou.backend.entities.Item;

import jakarta.persistence.LockModeType;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long>{
    Optional<Item> findByNameEnIgnoreCase(String nameEn);
    List<Item> findByCategories(Category category);
    List<Item> findByCategoriesAndActiveTrue(Category category);
    List<Item> findByActiveTrue();
    List<Item> findByActiveFalse();
    Optional<Item> findByIdAndActiveTrue(Long id);
    List<Item> findByLabels_IdAndActiveTrue(Long labelId);
    List<Item> findByLabels_Id(Long labelId);
    @Query("SELECT DISTINCT i FROM Item i JOIN i.labels l WHERE l.id IN :labelIds AND i.active = true")
    List<Item> findByAnyLabelIdInAndActiveTrue(@Param("labelIds") Collection<Long> labelIds);
    @Query("SELECT DISTINCT i FROM Item i JOIN i.categories c WHERE c.id IN :categoryIds AND i.active = true")
    List<Item> findByAnyCategoryIdInAndActiveTrue(@Param("categoryIds") Collection<Long> categoryIds);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Item i WHERE i.id = :id")
    Optional<Item> findByIdWithLock(Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Item i WHERE i.id IN :ids")
    List<Item> findAllByIdWithLock(@Param("ids") List<Long> ids);
    /**
     * Atomically applies a stock delta (restock / correction). Guarded so stock
     * can never go negative. Composes with concurrent checkout decrements — no
     * lost updates. Returns rows updated: 0 means not found or would go negative.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Item i SET i.stock = i.stock + :delta WHERE i.id = :id AND i.stock + :delta >= 0")
    int adjustStock(@Param("id") Long id, @Param("delta") int delta);

    /**
     * Sets absolute stock, but only if the caller's expected version still matches
     * (optimistic guard against a sale slipping in since the admin loaded the form).
     * Returns rows updated: 0 means not found or version conflict.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Item i SET i.stock = :stock, i.version = i.version + 1 WHERE i.id = :id AND i.version = :expectedVersion")
    int setStockIfVersion(@Param("id") Long id, @Param("stock") int stock, @Param("expectedVersion") long expectedVersion);

    /** Atomic size-stock delta, guarded against negative. See {@link #adjustStock}. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ItemSize s SET s.stock = s.stock + :delta WHERE s.id = :id AND s.stock + :delta >= 0")
    int adjustSizeStock(@Param("id") Long id, @Param("delta") int delta);

    /** Absolute size-stock set with optimistic version guard. See {@link #setStockIfVersion}. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ItemSize s SET s.stock = :stock, s.version = s.version + 1 WHERE s.id = :id AND s.version = :expectedVersion")
    int setSizeStockIfVersion(@Param("id") Long id, @Param("stock") int stock, @Param("expectedVersion") long expectedVersion);

    /** Atomically increments all sales counters for one item — avoids lost-update under concurrent webhooks. */
    @Modifying
    @Query("UPDATE Item i SET " +
           "i.nbSold = i.nbSold + :qty, " +
           "i.nbSoldMonth = i.nbSoldMonth + :qty, " +
           "i.totalSalesWeek = i.totalSalesWeek + :amount, " +
           "i.totalSalesMonth = i.totalSalesMonth + :amount, " +
           "i.totalSalesQuarter = i.totalSalesQuarter + :amount, " +
           "i.totalSalesYear = i.totalSalesYear + :amount, " +
           "i.totalSales = i.totalSales + :amount " +
           "WHERE i.id = :id")
    void incrementSalesStats(@Param("id") Long id, @Param("qty") int qty, @Param("amount") java.math.BigDecimal amount);

    /** Atomically detaches a label from all items (junction table only). */
    @Modifying
    @Query(value = "DELETE FROM item_labels WHERE label_id = :labelId", nativeQuery = true)
    void detachLabel(@Param("labelId") Long labelId);

    @Modifying
    @Query("UPDATE Item i SET i.nbSoldMonth = 0")
    void resetNbSoldMonth();
    @Modifying
    @Query("UPDATE Item i SET i.totalSalesWeek = 0")
    void resetSalesWeek();
    @Modifying
    @Query("UPDATE Item i SET i.totalSalesMonth = 0")
    void resetSalesMonth();
    @Modifying
    @Query("UPDATE Item i SET i.totalSalesQuarter = 0")
    void resetSalesQuarter();
    @Modifying
    @Query("UPDATE Item i SET i.totalSalesYear = 0")
    void resetSalesYear();
    @Query("SELECT new com.bijou.backend.repositories.RevenueStats(" +
       "COALESCE(SUM(i.totalSales), 0), " +
       "COALESCE(SUM(i.totalSalesWeek), 0), " +
       "COALESCE(SUM(i.totalSalesMonth), 0), " +
       "COALESCE(SUM(i.totalSalesQuarter), 0), " +
       "COALESCE(SUM(i.totalSalesYear), 0)) " +
       "FROM Item i")
    RevenueStats getRevenueTotals();
}
