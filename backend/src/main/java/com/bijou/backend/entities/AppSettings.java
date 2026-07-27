package com.bijou.backend.entities;

import java.math.BigDecimal;

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

    /** Human-readable reason the relay was auto-disabled, null when enabled. */
    private String disabledReason;

    /** Whether MSI (Meses Sin Intereses) installment plans are offered at checkout. */
    private boolean msiEnabled;

    /** When true, Stripe runs against live credentials (real charges); false = test mode. */
    private boolean stripeLiveMode;

    /** Flat shipping fee (MXN) for standard-zone Mexican states. */
    private BigDecimal standardShippingFee;

    /** Flat shipping fee (MXN) for extended-zone states (Baja, remote south/southeast). */
    private BigDecimal extendedShippingFee;

    /** Item subtotal (MXN) at or above which shipping is free. */
    private BigDecimal freeShippingThreshold;
}
