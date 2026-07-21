package com.bijou.backend.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.bijou.backend.entities.CfdiUso;
import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.RegimenFiscal;
import com.bijou.backend.entities.Status;

public record OrderView(
    String addressLine1,
    String addressLine2,
    String colonial,
    String city,
    String state,
    String postalCode,
    String email,
    String firstName,
    String lastName,
    List<OrderItemView> items,
    String tracking,
    BigDecimal total,
    LocalDateTime createdAt,
    Status status,
    Long id,
    Country country,
    Integer installments,
    boolean oxxo,
    boolean bankTransfer,
    BigDecimal dutyAmount,
    BigDecimal taxAmount,
    BigDecimal handlingFee,
    BigDecimal shippingFee,
    String facturaUrl,
    boolean facturaRequested,
    CfdiUso cfdiUso,
    String rfc,
    RegimenFiscal regimenFiscal
){}
