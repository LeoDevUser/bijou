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
 * ships from Mexico → US / CA / MX domestic
 *
 * Global settings
 * ---------------
 * All Bijou Monde transactions are processed in MXN. Customs duties for US/CA orders are
 * assessed on the USD customs value, but since the customer is charged in MXN we must convert.
 * Mathematically: dutyMxn = itemMxn × (baseRate × 1.03) × dutyRate / baseRate
 *                          = itemMxn × dutyRate × 1.03
 * The base rate cancels, leaving a flat 3% buffer (MXN_TO_USD_BUFFER_FACTOR) on top of the
 * duty amount. This 3% cushion covers exchange-rate slippage between order time and the point
 * at which duties are actually remitted. IVA and GST/HST are sales taxes and carry no FX risk,
 * so the buffer is NOT applied to them.
 *
 * United States (no de minimis)
 * ------------------------------
 * USMCA-qualified items: 0% duty.
 * Non-USMCA: base material rate + 15% Section 122 surcharge.
 *   Silver (HTS 7113.11): 5.0% + 15% = 20.0%
 *   Gold   (HTS 7113.19): 5.5% + 15% = 20.5%
 *   Steel  (HTS 7117.19): 11.0% + 15% = 26.0%
 *
 * Canada
 * ------
 * USMCA-qualified items: 0% duty.
 * Non-USMCA: 8.5% MFN flat rate.
 * GST/HST (13%) applied on the duty-inclusive value for orders whose subtotal exceeds $40 CAD
 * (threshold checked only when the order currency is CAD; otherwise GST always applies).
 *
 * Mexico (domestic only — export orders carry 0% IVA)
 * ----------------------------------------------------
 * Silver / Steel: 16% IVA.
 * Gold: 0% IVA (hardcoded exemption for domestic gold jewelry).
 */
@Service
public class TaxService {

    /**
     * Base MXN→USD exchange rate injected from application.properties.
     * Default ~0.05 (1 MXN ≈ 0.05 USD). The 3% slippage buffer is applied at runtime.
     */
    @Value("${tax.mxn.to.usd.base-rate:0.05}")
    private BigDecimal mxnToUsdBaseRate;

    // Global ─────────────────────────────────────────────────────────────────────
    private static final BigDecimal MXN_TO_USD_BUFFER_FACTOR = new BigDecimal("1.03");

    // United States ──────────────────────────────────────────────────────────────
    private static final BigDecimal US_SECTION_122_SURCHARGE = new BigDecimal("0.15");
    private static final BigDecimal US_BASE_SILVER = new BigDecimal("0.05");   // HTS 7113.11
    private static final BigDecimal US_BASE_GOLD   = new BigDecimal("0.055");  // HTS 7113.19
    private static final BigDecimal US_BASE_STEEL  = new BigDecimal("0.11");   // HTS 7117.19

    // Canada ─────────────────────────────────────────────────────────────────────
    private static final BigDecimal CA_MFN_RATE       = new BigDecimal("0.085");
    private static final BigDecimal CA_GST_HST_RATE   = new BigDecimal("0.13");
    private static final BigDecimal CA_GST_THRESHOLD  = new BigDecimal("40");   // CAD

    // Mexico ─────────────────────────────────────────────────────────────────────
    private static final BigDecimal MX_IVA_STANDARD = new BigDecimal("0.16");

    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Returns the effective MXN→USD rate including the 3% slippage buffer.
     */
    public BigDecimal effectiveMxnToUsdRate() {
        return mxnToUsdBaseRate.multiply(MXN_TO_USD_BUFFER_FACTOR).setScale(6, RoundingMode.HALF_UP);
    }

    /**
     * Calculates duties and taxes for an order.
     *
     * @param orderItems items in the order (each carries {@code material} and {@code usmcaQualified} on the Item)
     * @param country    destination country
     * @param currency   billing currency — used for the Canada GST/HST $40 CAD threshold check
     * @param subtotal   pre-tax order subtotal in the billing currency
     * @return a {@link TaxResult} containing the separate duty and tax amounts
     */
    public TaxResult calculate(List<OrderItem> orderItems, Country country, Currency currency, BigDecimal subtotal) {
        BigDecimal duty = BigDecimal.ZERO;
        BigDecimal tax  = BigDecimal.ZERO;

        switch (country) {
            case UNITED_STATES -> duty = calcUsDuty(orderItems);
            case CANADA -> {
                duty = calcCaDuty(orderItems);
                tax  = calcCaGst(subtotal.add(duty), currency);
            }
            // country == MEXICO → domestic shipment; exports carry 0% IVA and are handled elsewhere
            case MEXICO -> tax = calcMxIva(orderItems);
        }

        return new TaxResult(
            duty.setScale(2, RoundingMode.HALF_UP),
            tax.setScale(2, RoundingMode.HALF_UP)
        );
    }

    // ── United States ────────────────────────────────────────────────────────────

    private BigDecimal calcUsDuty(List<OrderItem> orderItems) {
        // All prices are in MXN. Duty is assessed on the USD customs value, so we simulate:
        //   dutyMxn = (itemMxn × baseRate × 1.03) × dutyRate / baseRate
        //           = itemMxn × dutyRate × 1.03
        // The base rate cancels; the net effect is a 3% slippage buffer on the MXN duty
        // amount, protecting against FX movement between order time and duty remittance.
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem oi : orderItems) {
            if (oi.getItem().isUsmcaQualified()) continue; // 0% duty
            BigDecimal itemValue = oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity()));
            BigDecimal rate = usBaseRate(oi.getItem().getMaterial()).add(US_SECTION_122_SURCHARGE);
            total = total.add(itemValue.multiply(rate).multiply(MXN_TO_USD_BUFFER_FACTOR));
        }
        return total;
    }

    private BigDecimal usBaseRate(JewelryMaterial material) {
        if (material == null) return BigDecimal.ZERO;
        return switch (material) {
            case SILVER -> US_BASE_SILVER;
            case GOLD   -> US_BASE_GOLD;
            case STEEL  -> US_BASE_STEEL;
        };
    }

    // ── Canada ───────────────────────────────────────────────────────────────────

    private BigDecimal calcCaDuty(List<OrderItem> orderItems) {
        // Same MXN_TO_USD_BUFFER_FACTOR logic as US: 3% cushion on duty collected in MXN.
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem oi : orderItems) {
            if (oi.getItem().isUsmcaQualified()) continue; // 0% duty
            BigDecimal itemValue = oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity()));
            total = total.add(itemValue.multiply(CA_MFN_RATE).multiply(MXN_TO_USD_BUFFER_FACTOR));
        }
        return total;
    }

    /**
     * GST/HST (13%) is applied on the duty-inclusive value.
     * When the billing currency is CAD, the threshold ($40 CAD) is checked directly.
     * For any other currency the threshold cannot be reliably compared without a conversion
     * rate, so GST/HST is applied unconditionally.
     */
    private BigDecimal calcCaGst(BigDecimal dutyInclusiveValue, Currency currency) {
        if (currency == Currency.CAD && dutyInclusiveValue.compareTo(CA_GST_THRESHOLD) <= 0) {
            return BigDecimal.ZERO;
        }
        return dutyInclusiveValue.multiply(CA_GST_HST_RATE);
    }

    // ── Mexico (domestic) ────────────────────────────────────────────────────────

    private BigDecimal calcMxIva(List<OrderItem> orderItems) {
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem oi : orderItems) {
            BigDecimal ivaRate = mxIvaRate(oi.getItem().getMaterial());
            if (ivaRate.compareTo(BigDecimal.ZERO) == 0) continue;
            BigDecimal itemValue = oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity()));
            total = total.add(itemValue.multiply(ivaRate));
        }
        return total;
    }

    private BigDecimal mxIvaRate(JewelryMaterial material) {
        if (material == null) return MX_IVA_STANDARD;
        return switch (material) {
            case GOLD          -> BigDecimal.ZERO;     // 0% IVA — domestic gold jewelry exemption
            case SILVER, STEEL -> MX_IVA_STANDARD;    // 16% IVA
        };
    }
}
