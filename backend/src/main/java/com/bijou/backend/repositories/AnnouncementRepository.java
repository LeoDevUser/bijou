package com.bijou.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.Announcement;

import jakarta.persistence.LockModeType;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findAllByOrderBySortOrderAsc();
    List<Announcement> findByActiveTrueOrderBySortOrderAsc();

    /** Returns the highest sortOrder in use, or -1 if the table is empty. */
    @Query("SELECT COALESCE(MAX(a.sortOrder), -1) FROM Announcement a")
    int maxSortOrder();

    /** Loads all announcements ordered by sortOrder with a pessimistic write lock (for move ops). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Announcement a ORDER BY a.sortOrder ASC")
    List<Announcement> findAllOrderedWithLock();
}
