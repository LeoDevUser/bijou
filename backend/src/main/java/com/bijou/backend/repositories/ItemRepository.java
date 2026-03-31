package com.bijou.backend.repositories;

import java.math.BigDecimal;
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
    List<Item> findByCategory(Category category);
    List<Item> findByCategoryAndActiveTrue(Category category);
    List<Item> findByActiveTrue();
    List<Item> findByActiveFalse();
    Optional<Item> findByIdAndActiveTrue(Long id);
    List<Item> findByLabels_IdAndActiveTrue(Long labelId);
    List<Item> findByLabels_Id(Long labelId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Item i WHERE i.id = :id")
    Optional<Item> findByIdWithLock(Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Item i WHERE i.id IN :ids")
    List<Item> findAllByIdWithLock(@Param("ids") List<Long> ids);
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
