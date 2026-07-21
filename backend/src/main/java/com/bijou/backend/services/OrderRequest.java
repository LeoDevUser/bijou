package com.bijou.backend.services;

import java.util.List;

import com.bijou.backend.entities.CfdiUso;
import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.RegimenFiscal;

public record OrderRequest(
    List<OrderItemRequest> items,
    String addressLine1,
    String addressLine2,
    String colonial,
    String city,
    String state,
    String postalCode,
    Country country,
    Currency currency,
    Integer installments,
    // Factura (CFDI) request. When facturaRequested is true, rfc + regimenFiscal
    // + cfdiUso are required; rfc/regimenFiscal are persisted onto the client.
    boolean facturaRequested,
    String rfc,
    RegimenFiscal regimenFiscal,
    CfdiUso cfdiUso
){}
