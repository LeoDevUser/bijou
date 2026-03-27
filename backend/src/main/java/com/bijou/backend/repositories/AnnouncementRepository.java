package com.bijou.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.Announcement;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findAllByOrderBySortOrderAsc();
    List<Announcement> findByActiveTrueOrderBySortOrderAsc();
}
