package com.bijou.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bijou.backend.entities.AppSettings;

public interface AppSettingsRepository extends JpaRepository<AppSettings, Long> {
}
