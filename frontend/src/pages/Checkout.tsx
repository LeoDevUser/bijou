import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import type { Country, TaxPreview, FiscalCatalog } from '../types';
import { formatMoney } from '../types';
import { getStateOptions, getPostalCodePattern, getPostalCodePlaceholder, getPhonePlaceholder } from '../data/addressOptions';

// Mexico-only launch — re-add CANADA / UNITED_STATES here when cross-border
// shipping returns (backend rejects non-MEXICO orders with SHIPPING_MEXICO_ONLY).
const COUNTRIES: { value: Country; label: string }[] = [
  { value: 'MEXICO', label: 'Mexico' },
];

export default function Checkout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, total } = useCart();
  const { isAuthenticated, isLoading } = useAuth();
  const { currency, format } = useCurrency();

  type AddrForm = {
    addressLine1: string; addressLine2: string; colonial: string;
    city: string; state: string; postalCode: string; country: Country;
  };
  const emptyAddr: AddrForm = { addressLine1: '', addressLine2: '', colonial: '', city: '', state: '', postalCode: '', country: 'MEXICO' };
  const [form, setForm] = useState<AddrForm>(emptyAddr);
  const [savedForm, setSavedForm] = useState<AddrForm | null>(null);
  const [useSaved, setUseSaved] = useState(false);
  // Phone is optional at sign-up, so collect it here when the profile has none.
  const [phone, setPhone] = useState('');
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [installments, setInstallments] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxPreview, setTaxPreview] = useState<TaxPreview | null>(null);
  const [msiEnabled, setMsiEnabled] = useState(false);
  const previewAbortRef = useRef<AbortController | null>(null);

  // Factura (CFDI) request
  const [wantsFactura, setWantsFactura] = useState(false);
  const [fiscal, setFiscal] = useState<FiscalCatalog | null>(null);
  const [rfc, setRfc] = useState('');
  const [regimenFiscal, setRegimenFiscal] = useState('');
  const [cfdiUso, setCfdiUso] = useState('');

  const MSI_PLANS = [
    { months: 3, rate: 0.02 },
    { months: 6, rate: 0.04 },
    { months: 9, rate: 0.06 },
    { months: 12, rate: 0.08 },
  ];
  const stateOptions = getStateOptions(form.country);
  const stateLabel = form.country === 'CANADA' ? 'Province' : 'State';

  // Usos de CFDI valid for the selected régimen fiscal (SAT matrix)
  const selectedRegimen = fiscal?.regimenes.find(r => r.name === regimenFiscal) ?? null;
  const usoOptions = selectedRegimen
    ? (fiscal?.usos ?? []).filter(u => selectedRegimen.usos.includes(u.code))
    : [];

  // Tax-inclusive base total; falls back to cart total while preview loads
  const taxedTotal = taxPreview ? taxPreview.total : total;
  const showMsi = msiEnabled && currency === 'MXN' && taxedTotal >= 2000;
  const selectedPlan = MSI_PLANS.find(p => p.months === installments) ?? null;
  const finalTotal = selectedPlan ? taxedTotal * (1 + selectedPlan.rate) : taxedTotal;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate('/login');
    else if (items.length === 0) navigate('/cart');
  }, [isLoading, isAuthenticated, items.length, navigate]);

  useEffect(() => {
    api.admin.settings.get().then(s => setMsiEnabled(s.msiEnabled)).catch(() => {});
    api.fiscal.catalog().then(setFiscal).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.account.getProfile()
      .then(profile => {
        // Phone is optional at sign-up; require it here if the profile still lacks one
        setPhoneRequired(!profile.phoneNumber?.trim());
        // Prefill fiscal identity if the client has requested a factura before
        if (profile.rfc) setRfc(profile.rfc);
        if (profile.regimenFiscal) setRegimenFiscal(profile.regimenFiscal);
        // Only offer the saved address when the profile actually holds every
        // field an order requires. Address/phone are optional at sign-up, so most
        // first-time buyers have blanks here — showing "Use Saved Address" then
        // would prefill an unusable partial address. Colonia is required for Mexico.
        // Saved US/CA addresses predate the Mexico-only launch — can't ship there.
        const hasCompleteAddress = profile.country === 'MEXICO'
          && [profile.addressLine1, profile.colonial, profile.city, profile.state, profile.postalCode]
            .every(v => v?.trim());
        if (hasCompleteAddress) {
          const saved: AddrForm = {
            addressLine1: profile.addressLine1,
            addressLine2: profile.addressLine2 ?? '',
            colonial: profile.colonial ?? '',
            city: profile.city,
            state: profile.state,
            postalCode: profile.postalCode,
            country: profile.country as Country,
          };
          setSavedForm(saved);
          setForm(saved);
          setUseSaved(true);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Fetch tax preview whenever country, currency, cart items, or the factura
  // toggle change — gold is IVA-exempt only against a factura, so the toggle
  // moves the total and the summary has to follow it.
  useEffect(() => {
    if (!isAuthenticated || items.length === 0) return;
    if (previewAbortRef.current) previewAbortRef.current.abort();
    const ctrl = new AbortController();
    previewAbortRef.current = ctrl;
    api.orders.taxPreview({
      items: items.map(i => ({ itemId: i.id, sizeId: i.sizeId ?? null, quantity: i.quantity })),
      country: form.country,
      currency,
      state: form.state || null,
      facturaRequested: wantsFactura,
    }).then(p => {
      if (!ctrl.signal.aborted) setTaxPreview(p);
    }).catch(() => {});
    return () => ctrl.abort();
  }, [isAuthenticated, items, form.country, form.state, currency, wantsFactura]);

  function handleUseSavedToggle(use: boolean) {
    setUseSaved(use);
    setForm(use && savedForm ? savedForm : emptyAddr);
  }

  if (!isAuthenticated || items.length === 0) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Save the phone number to the profile if it was missing at sign-up
      if (phoneRequired) {
        await api.account.changePhone(phone.trim());
      }
      const { order, clientSecret } = await api.orders.create({
        items: items.map(i => ({ itemId: i.id, sizeId: i.sizeId ?? null, quantity: i.quantity })),
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || null,
        colonial: form.colonial || null,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country,
        currency,
        installments: installments ?? null,
        facturaRequested: wantsFactura,
        rfc: wantsFactura ? rfc.trim().toUpperCase() : null,
        regimenFiscal: wantsFactura ? regimenFiscal : null,
        cfdiUso: wantsFactura ? cfdiUso : null,
      });
      navigate('/payment', { state: { clientSecret, total: order.total, installments: installments ?? null } });
    } catch (err) {
      const e = err as { code?: string };
      setError(e.code ?? t('checkout.error'));
    } finally {
      setLoading(false);
    }
  }

  function TaxTooltip({ text }: { text: string }) {
    return (
      <span className="relative group ml-1 inline-flex items-center">
        <span className="w-3.5 h-3.5 rounded-full border border-current inline-flex items-center justify-center text-[9px] leading-none cursor-default select-none opacity-50 group-hover:opacity-100 transition-opacity">
          i
        </span>
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-dark text-white text-[11px] leading-relaxed px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-left font-sans normal-case tracking-normal">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-dark" />
        </span>
      </span>
    );
  }

  const dutyTooltip = form.country === 'UNITED_STATES'
    ? t('checkout.tooltip.dutyUs')
    : t('checkout.tooltip.dutyCa');
  const taxTooltip = form.country === 'MEXICO'
    ? t('checkout.tooltip.taxMx')
    : t('checkout.tooltip.taxCa');

  // IVA on the cart's gold, which only a factura waives. Non-zero = the factura
  // toggle changes what this client pays, so say so instead of letting the total
  // move on its own.
  const goldIva = taxPreview?.goldIvaWaivable ?? 0;

  const inputClass = 'w-full border border-border bg-cream px-4 py-3 text-sm outline-none focus:border-dark transition-colors';
  const labelClass = 'block text-xs uppercase tracking-widest mb-2';

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-10">{t('checkout.title')}</h1>

      <div className="grid md:grid-cols-[1fr_300px] gap-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>{t('checkout.address')}</label>
            {savedForm && (
              <div className="flex gap-4 mb-3">
                <button type="button" onClick={() => handleUseSavedToggle(true)}
                  className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors cursor-pointer ${useSaved ? 'bg-dark text-white border-dark' : 'border-border hover:border-dark'}`}>
                  {t('checkout.useSavedAddress')}
                </button>
                <button type="button" onClick={() => handleUseSavedToggle(false)}
                  className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors cursor-pointer ${!useSaved ? 'bg-dark text-white border-dark' : 'border-border hover:border-dark'}`}>
                  {t('checkout.enterNewAddress')}
                </button>
              </div>
            )}
          </div>

          {/* Country — drives state list and postal format */}
          <div>
            <label className={labelClass}>{t('checkout.country')}</label>
            <select
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value as Country, state: '' }))}
              disabled={useSaved && !!savedForm}
              className={`${inputClass} appearance-none cursor-pointer ${useSaved && savedForm ? 'opacity-60 cursor-default' : ''}`}
            >
              {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Phone — only when the profile has none (optional at sign-up) */}
          {phoneRequired && (
            <div>
              <label className={labelClass}>{t('auth.phoneNumber')}</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                placeholder={getPhonePlaceholder(form.country)}
                className={inputClass}
              />
            </div>
          )}

          {/* Address Line 1 */}
          <div>
            <label className={labelClass}>{t('auth.addressLine1')}</label>
            <input
              type="text"
              value={form.addressLine1}
              onChange={e => setForm(f => ({ ...f, addressLine1: e.target.value }))}
              required
              readOnly={useSaved && !!savedForm}
              className={`${inputClass} ${useSaved && savedForm ? 'opacity-60 cursor-default' : ''}`}
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className={labelClass}>{t('auth.addressLine2')}<span className="text-muted normal-case tracking-normal ml-1.5 text-[10px]">({t('auth.optional')})</span></label>
            <input
              type="text"
              value={form.addressLine2}
              onChange={e => setForm(f => ({ ...f, addressLine2: e.target.value }))}
              readOnly={useSaved && !!savedForm}
              className={`${inputClass} ${useSaved && savedForm ? 'opacity-60 cursor-default' : ''}`}
            />
          </div>

          {/* Colonia — Mexico only */}
          {form.country === 'MEXICO' && (
            <div>
              <label className={labelClass}>{t('auth.colonial')}</label>
              <input
                type="text"
                value={form.colonial}
                onChange={e => setForm(f => ({ ...f, colonial: e.target.value }))}
                required
                readOnly={useSaved && !!savedForm}
                className={`${inputClass} ${useSaved && savedForm ? 'opacity-60 cursor-default' : ''}`}
              />
            </div>
          )}

          {/* City + State/Province */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('auth.city')}</label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                required
                readOnly={useSaved && !!savedForm}
                className={`${inputClass} ${useSaved && savedForm ? 'opacity-60 cursor-default' : ''}`}
              />
            </div>
            <div>
              <label className={labelClass}>{stateLabel}</label>
              <select
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                required
                disabled={useSaved && !!savedForm}
                className={`${inputClass} appearance-none cursor-pointer ${useSaved && savedForm ? 'opacity-60 cursor-default' : ''}`}
              >
                <option value="" disabled>— {stateLabel} —</option>
                {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Postal Code */}
          <div>
            <label className={labelClass}>{t('auth.postalCode')}</label>
            <input
              type="text"
              value={form.postalCode}
              onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
              required
              pattern={getPostalCodePattern(form.country)}
              placeholder={getPostalCodePlaceholder(form.country)}
              readOnly={useSaved && !!savedForm}
              className={`${inputClass} ${useSaved && savedForm ? 'opacity-60 cursor-default' : ''}`}
            />
          </div>
          {currency !== 'MXN' && (
            <p className="text-xs text-muted border border-border px-4 py-3 leading-relaxed">
              {t('checkout.currencyNotice')}
            </p>
          )}

          {/* Factura (CFDI) request — Mexico only */}
          {form.country === 'MEXICO' && fiscal && (
            <div className={`border p-5 space-y-4 ${goldIva > 0 && !wantsFactura ? 'border-gold' : 'border-border'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wantsFactura}
                  onChange={e => setWantsFactura(e.target.checked)}
                  className="w-4 h-4 accent-dark cursor-pointer"
                />
                <span className="text-xs uppercase tracking-widest">{t('checkout.factura.request')}</span>
              </label>

              {/* Gold is IVA-exempt only with a factura — spell out what the box is worth. */}
              {goldIva > 0 && (
                <p className={`text-xs leading-relaxed ${wantsFactura ? 'text-muted' : 'text-dark'}`}>
                  {wantsFactura
                    ? t('checkout.factura.goldWaived', { amount: format(goldIva) })
                    : t('checkout.factura.goldPrompt', { amount: format(goldIva) })}
                </p>
              )}

              {wantsFactura && (
                <div className="space-y-4 pt-1">
                  <p className="text-xs text-muted leading-relaxed">{t('checkout.factura.notice')}</p>

                  {/* RFC */}
                  <div>
                    <label className={labelClass}>{t('checkout.factura.rfc')}</label>
                    <input
                      type="text"
                      value={rfc}
                      onChange={e => setRfc(e.target.value.toUpperCase())}
                      required={wantsFactura}
                      maxLength={13}
                      placeholder="XAXX010101000"
                      className={`${inputClass} uppercase`}
                    />
                  </div>

                  {/* Régimen Fiscal */}
                  <div>
                    <label className={labelClass}>{t('checkout.factura.regimen')}</label>
                    <select
                      value={regimenFiscal}
                      onChange={e => { setRegimenFiscal(e.target.value); setCfdiUso(''); }}
                      required={wantsFactura}
                      className={`${inputClass} appearance-none cursor-pointer`}
                    >
                      <option value="" disabled>— {t('checkout.factura.regimen')} —</option>
                      {fiscal.regimenes.map(r => (
                        <option key={r.name} value={r.name}>{r.code} — {r.description}</option>
                      ))}
                    </select>
                  </div>

                  {/* Uso de CFDI — filtered by régimen */}
                  <div>
                    <label className={labelClass}>{t('checkout.factura.uso')}</label>
                    <select
                      value={cfdiUso}
                      onChange={e => setCfdiUso(e.target.value)}
                      required={wantsFactura}
                      disabled={!selectedRegimen}
                      className={`${inputClass} appearance-none cursor-pointer ${!selectedRegimen ? 'opacity-60 cursor-default' : ''}`}
                    >
                      <option value="" disabled>— {t('checkout.factura.uso')} —</option>
                      {usoOptions.map(u => (
                        <option key={u.code} value={u.code}>{u.code} — {u.description}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {showMsi && (
            <div className="border border-border p-5">
              <p className="text-xs uppercase tracking-widest mb-4">{t('checkout.msi.title')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 font-normal text-muted text-xs uppercase tracking-widest w-1/5">{t('checkout.msi.planCol')}</th>
                      <th className="pb-2 font-normal text-muted text-xs uppercase tracking-widest">{t('checkout.msi.cashCol')}</th>
                      {MSI_PLANS.map(p => (
                        <th key={p.months} className="pb-2 font-normal text-muted text-xs uppercase tracking-widest">{t('checkout.msi.months', { n: p.months })}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2 text-xs text-muted">{t('checkout.msi.totalRow')}</td>
                      <td className="py-2">${formatMoney(taxedTotal)}</td>
                      {MSI_PLANS.map(p => (
                        <td key={p.months} className="py-2">${formatMoney(taxedTotal * (1 + p.rate))}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-xs text-muted">{t('checkout.msi.monthlyRow')}</td>
                      <td className="py-2 text-muted">—</td>
                      {MSI_PLANS.map(p => (
                        <td key={p.months} className="py-2">${formatMoney(taxedTotal * (1 + p.rate) / p.months)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-xs text-muted">{t('checkout.msi.feeRow')}</td>
                      <td className="py-2 text-muted">0%</td>
                      {MSI_PLANS.map(p => (
                        <td key={p.months} className="py-2 text-muted">+{(p.rate * 100).toFixed(0)}%</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInstallments(null)}
                  className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors cursor-pointer ${installments === null ? 'bg-dark text-white border-dark' : 'border-border hover:border-dark'}`}
                >
                  {t('checkout.msi.contado')}
                </button>
                {MSI_PLANS.map(p => (
                  <button
                    key={p.months}
                    type="button"
                    onClick={() => setInstallments(p.months)}
                    className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors cursor-pointer ${installments === p.months ? 'bg-dark text-white border-dark' : 'border-border hover:border-dark'}`}
                  >
                    {t('checkout.msi.months', { n: p.months })}
                  </button>
                ))}
              </div>
              {installments && (
                <p className="text-xs text-muted mt-3">
                  {t('checkout.msi.summary', { total: formatMoney(taxedTotal * (1 + (selectedPlan?.rate ?? 0))), n: installments, monthly: formatMoney(taxedTotal * (1 + (selectedPlan?.rate ?? 0)) / installments) })}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-dark text-white text-xs uppercase tracking-widest py-4 hover:bg-gold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? t('checkout.processing') : t('checkout.placeOrder')}
          </button>
        </form>

        {/* Order summary */}
        <div>
          <div className="border border-border p-6">
            <h2 className="text-xs uppercase tracking-widest mb-6">{t('checkout.orderSummary')}</h2>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted">{item.name} × {item.quantity}</span>
                  <span>{format(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            {taxPreview && (taxPreview.dutyAmount > 0 || taxPreview.taxAmount > 0 || taxPreview.handlingFee > 0 || taxPreview.shippingFee > 0 || goldIva > 0) && (
              <div className="space-y-1 border-t border-border pt-3 mb-3">
                <div className="flex justify-between text-sm text-muted">
                  <span>{t('cart.subtotal')}</span>
                  <span>{format(taxPreview.subtotal)}</span>
                </div>
                {taxPreview.dutyAmount > 0 && (
                  <div className="flex justify-between text-sm text-muted">
                    <span className="flex items-center">{t('checkout.duty')}<TaxTooltip text={dutyTooltip} /></span>
                    <span>+{format(taxPreview.dutyAmount)}</span>
                  </div>
                )}
                {taxPreview.taxAmount > 0 && (
                  <div className="flex justify-between text-sm text-muted">
                    <span className="flex items-center">{t('checkout.tax')}<TaxTooltip text={taxTooltip} /></span>
                    <span>+{format(taxPreview.taxAmount)}</span>
                  </div>
                )}
                {taxPreview.handlingFee > 0 && (
                  <div className="flex justify-between text-sm text-muted">
                    <span className="flex items-center">{t('checkout.handling')}<TaxTooltip text={t('checkout.tooltip.handling')} /></span>
                    <span>+{format(taxPreview.handlingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted">
                  <span>{t('checkout.shippingFee')}</span>
                  <span>{taxPreview.shippingFee > 0 ? `+${format(taxPreview.shippingFee)}` : t('checkout.freeShipping')}</span>
                </div>
              </div>
            )}
            {selectedPlan && (
              <div className="space-y-1 border-t border-border pt-3 mb-3">
                <div className="flex justify-between text-sm text-muted">
                  <span>{t('checkout.taxedSubtotal')}</span>
                  <span>{format(taxedTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted">
                  <span>{t('checkout.msi.feeRow')} (+{(selectedPlan.rate * 100).toFixed(0)}%)</span>
                  <span>+{format(taxedTotal * selectedPlan.rate)}</span>
                </div>
              </div>
            )}
            <div className="border-t border-border pt-4 flex justify-between text-sm font-medium">
              <span>{t('cart.total')}</span>
              <span>{format(finalTotal)}</span>
            </div>
            {/* Kept out of the running total above: the factura doesn't discount the
                order, it decides whether the gold lines are taxed at all. */}
            {goldIva > 0 && (
              <p className={`text-xs mt-2 leading-relaxed ${wantsFactura ? 'text-muted' : 'text-dark'}`}>
                {wantsFactura
                  ? t('checkout.goldExemptNote', { amount: format(goldIva) })
                  : t('checkout.goldTaxedNote', { amount: format(goldIva) })}
              </p>
            )}
            {installments && (
              <p className="text-xs text-muted mt-2">{t('checkout.msi.badge', { n: installments })}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
