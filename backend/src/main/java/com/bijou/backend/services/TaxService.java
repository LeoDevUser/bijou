package com.bijou.backend.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.JewelryMaterial;
import com.bijou.backend.entities.OrderItem;

/**
 * Ships from Mexico → US / CA / MX domestic.
 *
 * ─── Global ──────────────────────────────────────────────────────────────────
 * All Bijou Monde transactions are processed in MXN. Customs duties for US/CA
 * orders are assessed on the USD/CAD customs value, but since the customer is
 * charged in MXN we must convert.
 *
 * Mathematically: dutyMxn = itemMxn × dutyRate × mxnToUsdBufferFactor
 * The MXN→USD base rate cancels, leaving a configurable slippage buffer
 * (default 1.5 %) on top of the duty amount. This cushion covers
 * exchange-rate movement between order time and duty remittance.
 * IVA and GST/HST are sales taxes with no FX risk, so the buffer is NOT
 * applied to them.
 *
 * ─── United States ───────────────────────────────────────────────────────────
 * As of August 29, 2025 (EO 14324) the US $800 de minimis duty-free threshold
 * is suspended for all countries. Every shipment — regardless of value — is now
 * subject to applicable duties. No de minimis check is applied here.
 *
 * USMCA-qualified items: 0 % duty.
 * Non-USMCA: base HTS rate + 15 % Section 122 surcharge.
 *   Silver (HTS 7113.11): 5.0 % + 15 % = 20.0 %
 *   Gold   (HTS 7113.19): 5.5 % + 15 % = 20.5 %
 *   Steel  (HTS 7117.19): 11.0 % + 15 % = 26.0 %
 *   Other  (HTS 7119.00): 11.0 % + 15 % = 26.0 %
 *
 * ─── Canada (CUSMA/USMCA courier thresholds, CBSA CN 20-18) ─────────────────
 * These thresholds apply to courier shipments shipped from Mexico (or the US)
 * where the goods have entered Mexican commerce. They do NOT apply to postal/
 * mail shipments (which fall under the lower CAD $20 threshold).
 *
 * Duty de minimis : CAD $150  → orders at or below this value owe 0 % MFN duty
 * Tax  de minimis : CAD $40   → orders at or below this value owe 0 % GST/HST
 *
 * USMCA-qualified items: 0 % duty (regardless of order value).
 * Non-USMCA items above CAD $150: 8.5 % MFN flat rate.
 * GST/HST (13 %) applied on the duty-inclusive value for orders whose
 * duty-inclusive subtotal exceeds CAD $40 (converted from MXN at the injected
 * MXN→CAD rate).
 *
 * ─── Mexico (domestic) ───────────────────────────────────────────────────────
 * Silver / Steel / Other: 16 % IVA.
 * Gold: 0 % IVA — but ONLY when the client requests a factura (CFDI) for the
 *   order. The domestic gold exemption has to be backed by an invoice; a sale
 *   with no factura is treated as a regular 16 % IVA sale. So the same gold
 *   piece costs 16 % less to a client who asks for a factura.
 * Export orders carry 0 % IVA and are handled in a separate flow.
 */
@Service
public class TaxService {

    // ── Injected exchange rates ───────────────────────────────────────────────

    /**
     * Base MXN → USD rate (e.g. 0.05 ≈ 1 MXN = $0.05 USD).
     * The slippage buffer is applied at runtime via mxnToUsdBufferFactor.
     */
    @Value("${tax.mxn.to.usd.base-rate:0.05}")
    private BigDecimal mxnToUsdBaseRate;

    /**
     * MXN → CAD rate used to evaluate Canada's de minimis thresholds.
     * Default ≈ 0.073 (1 MXN ≈ 0.073 CAD). Update periodically.
     * No slippage buffer is applied here — the CAD thresholds are fixed amounts
     * and carry no FX risk between order time and duty remittance.
     */
    @Value("${tax.mxn.to.cad.rate:0.073}")
    private BigDecimal mxnToCadRate;

    // ── Global ────────────────────────────────────────────────────────────────

    /**
     * FX slippage buffer applied to duty amounts collected in MXN.
     * Covers exchange-rate movement between order time and duty remittance.
     * Default 1.5 % — adjust via {@code tax.mxn.to.usd.buffer-factor} property.
     */
    @Value("${tax.mxn.to.usd.buffer-factor:1.015}")
    private BigDecimal mxnToUsdBufferFactor;

    // ── United States ─────────────────────────────────────────────────────────

    private static final BigDecimal US_SECTION_122_SURCHARGE = new BigDecimal("0.15");
    private static final BigDecimal US_BASE_SILVER = new BigDecimal("0.05");   // HTS 7113.11
    private static final BigDecimal US_BASE_GOLD   = new BigDecimal("0.055");  // HTS 7113.19
    private static final BigDecimal US_BASE_STEEL  = new BigDecimal("0.11");   // HTS 7117.19
    private static final BigDecimal US_BASE_OTHER  = new BigDecimal("0.11");   // HTS 7119.00

    // ── Canada ────────────────────────────────────────────────────────────────

    /** MFN duty rate for non-USMCA goods above the CAD $150 duty de minimis. */
    private static final BigDecimal CA_MFN_RATE = new BigDecimal("0.085");

    private static final BigDecimal CA_GST_HST_RATE = new BigDecimal("0.13");

    /**
     * CUSMA courier duty de minimis: CAD $150.
     * Per-item check: if an individual item's value in CAD is at or below this
     * threshold, no MFN duty is assessed on that item.
     * Source: CBSA Customs Notice 20-18; CUSMA Article 7.8(1)(f).
     */
    private static final BigDecimal CA_DUTY_DE_MINIMIS_CAD = new BigDecimal("150");

    /**
     * CUSMA courier tax de minimis: CAD $40.
     * Applied to the duty-inclusive order total converted to CAD.
     * If the total is at or below this threshold, GST/HST is waived.
     * Source: CBSA Customs Notice 20-18; CUSMA Article 7.8(1)(f).
     *
     * NOTE: This threshold applies ONLY to courier shipments shipped from
     * Mexico or the US where goods have entered Mexican/US commerce.
     * Postal/mail shipments use a lower CAD $20 threshold and are not
     * currently modelled here.
     */
    private static final BigDecimal CA_TAX_DE_MINIMIS_CAD = new BigDecimal("40");

    // ── International handling ────────────────────────────────────────────────

    /**
     * Minimum USD handling/disbursement fee for cross-border (US and CA) orders.
     * Converted to MXN at the base rate — no slippage buffer because this is a
     * fixed carrier charge, not a customs assessment.
     */
    private static final BigDecimal INTL_HANDLING_MIN_USD = new BigDecimal("15.00");
    private static final BigDecimal INTL_HANDLING_PCT     = new BigDecimal("0.02");

    // ── Mexico ────────────────────────────────────────────────────────────────

    public static final BigDecimal MX_IVA_STANDARD = new BigDecimal("0.16");

    /**
     * Backs the 16 % IVA out of a tax-inclusive MXN amount.
     *
     * <p>Used when the admin enters a price the way the client will see it billed
     * (IVA already applied) — items always store the net price, because IVA is
     * assessed per order at checkout and can be waived (gold + factura).</p>
     *
     * <p>2-decimal rounding means the round trip is not always exact: a $500.00
     * tax-inclusive entry nets $431.03, which bills back at $499.99. The admin UI
     * shows the resulting breakdown so the cent is never a surprise.</p>
     */
    public static BigDecimal netFromTaxInclusive(BigDecimal grossMxn) {
        return grossMxn.divide(BigDecimal.ONE.add(MX_IVA_STANDARD), 2, RoundingMode.HALF_UP);
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns the effective MXN → USD rate including the slippage buffer
     * (default 1.5 %).
     * Exposed for use by other services (e.g. landed-cost display).
     */
    public BigDecimal effectiveMxnToUsdRate() {
        return mxnToUsdBaseRate
                .multiply(mxnToUsdBufferFactor)
                .setScale(6, RoundingMode.HALF_UP);
    }

    /**
     * Calculates duties, taxes, and the international handling fee for an order.
     *
     * <p>All monetary inputs and outputs are in MXN.</p>
     *
     * @param orderItems       items in the order — each carries {@code material}
     *                         and {@code usmcaQualified} on the item entity
     * @param country          destination country
     * @param subtotal         pre-tax order subtotal in MXN
     * @param facturaRequested whether the client asked for a factura (CFDI).
     *                         Mexico only: gold is IVA-exempt only when true.
     * @return a {@link TaxResult} with duty, tax, and handling amounts (all MXN)
     */
    public TaxResult calculate(
            List<OrderItem> orderItems,
            Country country,
            BigDecimal subtotal,
            boolean facturaRequested) {

        BigDecimal duty            = BigDecimal.ZERO;
        BigDecimal tax             = BigDecimal.ZERO;
        BigDecimal handling        = BigDecimal.ZERO;
        BigDecimal goldIvaWaivable = BigDecimal.ZERO;

        switch (country) {
            case UNITED_STATES -> {
                duty     = calcUsDuty(orderItems);
                handling = intlHandlingFeeMxn(subtotal);
            }
            case CANADA -> {
                duty     = calcCaDuty(orderItems);
                tax      = calcCaGst(subtotal.add(duty));
                handling = intlHandlingFeeMxn(subtotal);
            }
            case MEXICO -> {
                tax             = calcMxIva(orderItems, facturaRequested);
                goldIvaWaivable = calcMxGoldIva(orderItems);
            }
        }

        return new TaxResult(
                duty           .setScale(2, RoundingMode.HALF_UP),
                tax            .setScale(2, RoundingMode.HALF_UP),
                handling       .setScale(2, RoundingMode.HALF_UP),
                goldIvaWaivable.setScale(2, RoundingMode.HALF_UP)
        );
    }

    // ── International handling ────────────────────────────────────────────────

    private BigDecimal intlHandlingFeeMxn(BigDecimal subtotalMxn) {
        // Convert the flat USD minimum to MXN at the base rate (no buffer —
        // this is a carrier charge, not a customs liability).
        BigDecimal minFee = INTL_HANDLING_MIN_USD
                .divide(mxnToUsdBaseRate, 2, RoundingMode.HALF_UP);
        BigDecimal pctFee = subtotalMxn
                .multiply(INTL_HANDLING_PCT)
                .setScale(2, RoundingMode.HALF_UP);
        return minFee.max(pctFee);
    }

    // ── United States ─────────────────────────────────────────────────────────

    /**
     * Calculates US import duty in MXN.
     *
     * <p>The US $800 de minimis exemption has been suspended for all countries
     * effective August 29, 2025 (EO 14324, continued February 2026).
     * All non-USMCA items are therefore dutiable regardless of order value.</p>
     *
     * <p>Math: dutyMxn = itemMxn × (baseRate + section122) × bufferFactor
     * The MXN→USD base rate cancels in the full conversion chain, leaving only
     * the slippage buffer (default 1.5 %) on top of the MXN duty amount.</p>
     */
    private BigDecimal calcUsDuty(List<OrderItem> orderItems) {
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem oi : orderItems) {
            if (oi.getItem().isUsmcaQualified()) continue; // 0 % duty

            BigDecimal itemValueMxn = oi.getUnitPrice()
                    .multiply(BigDecimal.valueOf(oi.getQuantity()));
            BigDecimal rate = usBaseRate(oi.getItem().getMaterial())
                    .add(US_SECTION_122_SURCHARGE);
            total = total.add(
                    itemValueMxn.multiply(rate).multiply(mxnToUsdBufferFactor));
        }
        return total;
    }

    private BigDecimal usBaseRate(JewelryMaterial material) {
        return switch (material) {
            case SILVER -> US_BASE_SILVER;
            case GOLD   -> US_BASE_GOLD;
            case STEEL  -> US_BASE_STEEL;
            case OTHER  -> US_BASE_OTHER;
        };
    }

    // ── Canada ────────────────────────────────────────────────────────────────

    /**
     * Calculates Canadian MFN duty in MXN.
     *
     * <p>Per CBSA CN 20-18 (CUSMA courier thresholds):
     * <ul>
     *   <li>USMCA-qualified items: 0 % duty regardless of value.</li>
     *   <li>Non-USMCA items at or below CAD $150 per item: 0 % duty
     *       (duty de minimis — converted from MXN at the injected CAD rate).</li>
     *   <li>Non-USMCA items above CAD $150: 8.5 % MFN + the slippage buffer
     *       (default 1.5 %).</li>
     * </ul>
     * </p>
     */
    private BigDecimal calcCaDuty(List<OrderItem> orderItems) {
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem oi : orderItems) {
            if (oi.getItem().isUsmcaQualified()) continue; // 0 % duty

            BigDecimal itemValueMxn = oi.getUnitPrice()
                    .multiply(BigDecimal.valueOf(oi.getQuantity()));

            // Convert item value to CAD to evaluate the CAD $150 duty de minimis.
            BigDecimal itemValueCad = itemValueMxn
                    .multiply(mxnToCadRate)
                    .setScale(2, RoundingMode.HALF_UP);

            if (itemValueCad.compareTo(CA_DUTY_DE_MINIMIS_CAD) <= 0) continue; // under $150 CAD

            total = total.add(
                    itemValueMxn.multiply(CA_MFN_RATE).multiply(mxnToUsdBufferFactor));
        }
        return total;
    }

    /**
     * Calculates Canadian GST/HST (13 %) in MXN.
     *
     * <p>Per CBSA CN 20-18 (CUSMA courier thresholds):
     * GST/HST is waived when the duty-inclusive order total, converted to CAD,
     * is at or below CAD $40. Above the threshold, 13 % applies on the full
     * duty-inclusive value.
     *
     * <p>The comparison is always performed in CAD using the injected MXN→CAD
     * rate, avoiding the currency-mismatch bug that would occur if the MXN
     * amount were compared directly to the CAD threshold.
     *
     * @param dutyInclusiveValueMxn subtotal + duty, in MXN
     */
    private BigDecimal calcCaGst(BigDecimal dutyInclusiveValueMxn) {
        BigDecimal dutyInclusiveValueCad = dutyInclusiveValueMxn
                .multiply(mxnToCadRate)
                .setScale(2, RoundingMode.HALF_UP);

        if (dutyInclusiveValueCad.compareTo(CA_TAX_DE_MINIMIS_CAD) <= 0) {
            return BigDecimal.ZERO;
        }
        return dutyInclusiveValueMxn.multiply(CA_GST_HST_RATE);
    }

    // ── Mexico (domestic) ─────────────────────────────────────────────────────

    private BigDecimal calcMxIva(List<OrderItem> orderItems, boolean facturaRequested) {
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem oi : orderItems) {
            BigDecimal ivaRate = mxIvaRate(oi.getItem().getMaterial(), facturaRequested);
            if (ivaRate.compareTo(BigDecimal.ZERO) == 0) continue;
            total = total.add(lineValueMxn(oi).multiply(ivaRate));
        }
        return total;
    }

    /**
     * IVA charged on the gold lines of a domestic order at the standard 16 %.
     *
     * <p>This is the amount a factura removes from the order: it is what the
     * client is currently being charged on gold when no factura is requested,
     * and what they are saving when one is. Reported alongside the tax so the
     * checkout can spell the trade-off out instead of silently repricing.</p>
     */
    private BigDecimal calcMxGoldIva(List<OrderItem> orderItems) {
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem oi : orderItems) {
            if (oi.getItem().getMaterial() != JewelryMaterial.GOLD) continue;
            total = total.add(lineValueMxn(oi).multiply(MX_IVA_STANDARD));
        }
        return total;
    }

    private BigDecimal lineValueMxn(OrderItem oi) {
        return oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity()));
    }

    /**
     * Gold is exempt only against a factura — see the class javadoc. Without one
     * the sale is an ordinary 16 % IVA sale like any other material.
     */
    private BigDecimal mxIvaRate(JewelryMaterial material, boolean facturaRequested) {
        return switch (material) {
            case GOLD                 -> facturaRequested ? BigDecimal.ZERO : MX_IVA_STANDARD;
            case SILVER, STEEL, OTHER -> MX_IVA_STANDARD; // 16 %
        };
    }
}
