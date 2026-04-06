package com.bijou.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import com.bijou.backend.entities.ThemeConfig;

public interface ThemeConfigRepository extends JpaRepository<ThemeConfig, Long> {}
