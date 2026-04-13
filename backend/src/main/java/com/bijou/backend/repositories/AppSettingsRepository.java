package com.bijou.backend.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.bijou.backend.entities.AppSettings;

public interface AppSettingsRepository extends JpaRepository<AppSettings, Long> {

    /** Atomically sets smtpRelayEnabled=false. Single SQL UPDATE — safe under concurrent Brevo 429s. */
    @Modifying
    @Query("UPDATE AppSettings s SET s.smtpRelayEnabled = false, s.disabledReason = :reason WHERE s.id = 1")
    void autoDisable(@Param("reason") String reason);
}
