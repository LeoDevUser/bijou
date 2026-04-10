package com.bijou.backend.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "app_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppSettings {

    @Id
    private Long id;

    private boolean smtpRelayEnabled;
    private int emailsSentThisMonth;

    /** Last known remaining calls in the current Brevo rate-limit window. */
    private Integer rateLimitRemaining;

    /** Epoch seconds at which the current Brevo rate-limit window resets. */
    private Long rateLimitReset;

    /** Human-readable reason the relay was auto-disabled, null when enabled. */
    private String disabledReason;
}
