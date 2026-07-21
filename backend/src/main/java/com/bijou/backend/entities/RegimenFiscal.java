package com.bijou.backend.entities;

import java.util.Set;

import static com.bijou.backend.entities.CfdiUso.*;

/**
 * SAT "Régimen Fiscal" catalog (CFDI 4.0). The enum name is the SAT code
 * prefixed with {@code R} (constants cannot start with a digit); {@link #getCode()}
 * returns the bare official code. {@code description} is the official Spanish label.
 *
 * {@code fisica}/{@code moral} indicate which taxpayer types the régimen applies to,
 * and {@code allowedUsos} is the set of {@link CfdiUso} values SAT permits for this
 * régimen — used to validate a factura request at checkout.
 */
public enum RegimenFiscal {
    R601("601", "General de Ley Personas Morales", false, true, gi()),
    R603("603", "Personas Morales con Fines no Lucrativos", false, true, gi()),
    R605("605", "Sueldos y Salarios e Ingresos Asimilados a Salarios", true, false, union(deducciones(), Set.of(S01, CP01, CN01))),
    R606("606", "Arrendamiento", true, false, giWithDeducciones()),
    R607("607", "Régimen de Enajenación o Adquisición de Bienes", true, false, deduccionesBase()),
    R608("608", "Demás ingresos", true, false, deduccionesBase()),
    R610("610", "Residentes en el Extranjero sin Establecimiento Permanente en México", true, true, Set.of(S01, CP01)),
    R611("611", "Ingresos por Dividendos (socios y accionistas)", true, false, deduccionesBase()),
    R612("612", "Personas Físicas con Actividades Empresariales y Profesionales", true, false, giWithDeducciones()),
    R614("614", "Ingresos por intereses", true, false, deduccionesBase()),
    R615("615", "Régimen de los ingresos por obtención de premios", true, false, deduccionesBase()),
    R616("616", "Sin obligaciones fiscales", true, false, Set.of(S01, CP01)),
    R620("620", "Sociedades Cooperativas de Producción que optan por diferir sus ingresos", false, true, gi()),
    R621("621", "Incorporación Fiscal", true, false, gi()),
    R622("622", "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", false, true, gi()),
    R623("623", "Opcional para Grupos de Sociedades", false, true, gi()),
    R624("624", "Coordinados", false, true, gi()),
    R625("625", "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas", true, false, giWithDeducciones()),
    R626("626", "Régimen Simplificado de Confianza", true, true, gi());

    private final String code;
    private final String description;
    private final boolean fisica;
    private final boolean moral;
    private final Set<CfdiUso> allowedUsos;

    RegimenFiscal(String code, String description, boolean fisica, boolean moral, Set<CfdiUso> allowedUsos) {
        this.code = code;
        this.description = description;
        this.fisica = fisica;
        this.moral = moral;
        this.allowedUsos = allowedUsos;
    }

    public String getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }

    public boolean isFisica() {
        return fisica;
    }

    public boolean isMoral() {
        return moral;
    }

    public Set<CfdiUso> getAllowedUsos() {
        return allowedUsos;
    }

    public boolean allows(CfdiUso uso) {
        return allowedUsos.contains(uso);
    }

    // --- Reusable uso groups from the SAT matrix -------------------------------

    /** G01–G03 + I01–I08 + Sin efectos / Pagos — the "empresarial" set. */
    private static Set<CfdiUso> gi() {
        return Set.of(G01, G02, G03, I01, I02, I03, I04, I05, I06, I07, I08, S01, CP01);
    }

    /** Personal deductions D01–D10. */
    private static Set<CfdiUso> deducciones() {
        return Set.of(D01, D02, D03, D04, D05, D06, D07, D08, D09, D10);
    }

    /** Deductions + Sin efectos / Pagos. */
    private static Set<CfdiUso> deduccionesBase() {
        return union(deducciones(), Set.of(S01, CP01));
    }

    /** Empresarial set plus personal deductions (régimenes that allow both). */
    private static Set<CfdiUso> giWithDeducciones() {
        return union(gi(), deducciones());
    }

    private static Set<CfdiUso> union(Set<CfdiUso> a, Set<CfdiUso> b) {
        var s = new java.util.HashSet<>(a);
        s.addAll(b);
        return Set.copyOf(s);
    }
}
