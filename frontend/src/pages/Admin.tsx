import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { ItemView, ItemViewVerbose, ItemRequest, ItemSizeView, ItemSizeRequest, OrderView, VerboseClient, LabelView, CategoryView, AnnouncementView, CollectionView, CollectionSiteAssetView, CollectionThemeView, SalesStats, MaterialSalesStats, ThemeConfig, AppSettings, BrevoQuota, CloudinaryResource, CloudinaryResourcesPage, JewelryMaterial, PricingFormula } from '../types';
import { pickLocale, isItemIncomplete, isLabelIncomplete, formatMoney } from '../types';
import { useTheme, THEME_DEFAULTS, mergeCollectionTheme } from '../context/ThemeContext';

// ── Media naming ──────────────────────────────────────────────────────────────

/**
 * Ask the admin to name an upload; the backend uses it as the Cloudinary
 * public_id so the media library shows readable names. Cancelling or leaving
 * it empty falls back to the filename without extension.
 */
function promptMediaName(file: File, promptText: string): string {
  const fallback = file.name.replace(/\.[^.]+$/, '');
  const entered = window.prompt(promptText, fallback);
  return (entered ?? fallback).trim() || fallback;
}

// Mirrors the caps in CloudinaryService. Checked here too because a body over the
// server's multipart limit is cut off mid-flight — the browser reports a protocol
// error and never receives the 413 explaining why.
const MAX_IMAGE_MB = 25;
const MAX_VIDEO_MB = 100;

/** MB cap for a file, or 0 when it is within its limit. */
function overSizeLimitMb(file: File): number {
  const limit = file.type.startsWith('video/') ? MAX_VIDEO_MB : MAX_IMAGE_MB;
  return file.size > limit * 1024 * 1024 ? limit : 0;
}

// ── Color utilities ───────────────────────────────────────────────────────────

function parseColorToRgba(value: string): [number, number, number, number] {
  const v = (value ?? '').trim();
  if (v.startsWith('#')) {
    const h = v.slice(1);
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16), 1];
    if (h.length === 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), 1];
    if (h.length === 8) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), +(parseInt(h.slice(6,8),16)/255).toFixed(2)];
  }
  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (m) return [+m[1], +m[2], +m[3], m[4] != null ? +m[4] : 1];
  return [0, 0, 0, 1];
}

function toHex6(r: number, g: number, b: number): string {
  return '#' + [r,g,b].map(n => Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0')).join('');
}

function toColorString(r: number, g: number, b: number, a: number): string {
  const [ri,gi,bi] = [r,g,b].map(n => Math.max(0,Math.min(255,Math.round(n))));
  const ac = Math.round(Math.max(0,Math.min(1,a))*100)/100;
  if (ac >= 1) return toHex6(ri,gi,bi);
  return `rgba(${ri}, ${gi}, ${bi}, ${ac})`;
}

function toHex6Safe(value: string): string {
  if (!value) return '#000000';
  if (value.startsWith('#') && value.length === 7) return value;
  const [r,g,b] = parseColorToRgba(value);
  return toHex6(r,g,b);
}

// ── RGBA modal ────────────────────────────────────────────────────────────────

function RgbaModal({ value, onApply, onClose }: { value: string; onApply: (v: string) => void; onClose: () => void }) {
  const [r, g, b, a] = parseColorToRgba(value);
  const [rVal, setR] = useState(r);
  const [gVal, setG] = useState(g);
  const [bVal, setB] = useState(b);
  const [aVal, setA] = useState(a);

  const preview = toColorString(rVal, gVal, bVal, aVal);

  const sliders = [
    { label: 'R', val: rVal, set: setR, min: 0, max: 255, step: 1,
      gradient: `linear-gradient(to right, rgb(0,${gVal},${bVal}), rgb(255,${gVal},${bVal}))` },
    { label: 'G', val: gVal, set: setG, min: 0, max: 255, step: 1,
      gradient: `linear-gradient(to right, rgb(${rVal},0,${bVal}), rgb(${rVal},255,${bVal}))` },
    { label: 'B', val: bVal, set: setB, min: 0, max: 255, step: 1,
      gradient: `linear-gradient(to right, rgb(${rVal},${gVal},0), rgb(${rVal},${gVal},255))` },
    { label: 'A', val: aVal, set: setA, min: 0, max: 1, step: 0.01,
      gradient: `linear-gradient(to right, rgba(${rVal},${gVal},${bVal},0), rgba(${rVal},${gVal},${bVal},1))` },
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-[#FAFAF8] border border-[#E8E4DC] p-5 w-72 shadow-xl" onClick={e => e.stopPropagation()}>

        {/* Preview */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 border border-[#E8E4DC] flex-shrink-0"
            style={{ background: `linear-gradient(${preview}, ${preview}), repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px` }}
          />
          <div>
            <p className="text-xs font-mono">{preview}</p>
            <p className="text-xs text-[#9C9C9C] mt-0.5">{toHex6(rVal,gVal,bVal)} · A: {Math.round(aVal*100)}%</p>
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          {sliders.map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#9C9C9C] w-4 flex-shrink-0">{s.label}</span>
              <div className="relative flex-1 h-5 flex items-center">
                {/* Gradient track */}
                <div className="absolute left-0 right-0 h-2 rounded-sm" style={{ background: s.gradient }} />
                {/* Thumb indicator */}
                <div
                  className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white border border-[#999] shadow pointer-events-none"
                  style={{ left: `${((s.val - s.min) / (s.max - s.min)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                />
                {/* Invisible native input for interaction */}
                <input
                  type="range"
                  min={s.min} max={s.max} step={s.step}
                  value={s.val}
                  onChange={e => s.set(+e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="text-[11px] font-mono text-[#9C9C9C] w-8 text-right flex-shrink-0">
                {s.label === 'A' ? Math.round(aVal * 100) + '%' : Math.round(s.val)}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => { onApply(preview); onClose(); }}
            className="flex-1 text-xs uppercase tracking-widest border border-[#1C1C1C] bg-[#1C1C1C] text-white px-4 py-2 hover:bg-[#C9A96E] hover:border-[#C9A96E] transition-colors cursor-pointer"
          >
            Apply
          </button>
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-widest border border-[#E8E4DC] px-4 py-2 hover:border-[#1C1C1C] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reusable color input ──────────────────────────────────────────────────────

function ColorInput({ value: rawValue, onChange, placeholder, className: cls }: { value: string | null | undefined; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const value = rawValue ?? '';
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className={`flex items-center gap-2 ${cls ?? ''}`}>
        <div className="relative flex-1">
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || '#000000'}
            className="border border-[#E8E4DC] bg-[#FAFAF8] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C] transition-colors w-full pr-10"
          />
          {value && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm border border-[#E8E4DC]" style={{ background: value }} />
          )}
        </div>
        <input
          type="color"
          value={toHex6Safe(value)}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-9 border border-[#E8E4DC] cursor-pointer bg-[#FAFAF8] p-0.5 flex-shrink-0"
          title="Pick color"
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-[10px] uppercase tracking-widest border border-[#E8E4DC] px-2 h-9 hover:border-[#1C1C1C] transition-colors flex-shrink-0 text-[#9C9C9C] hover:text-[#1C1C1C] cursor-pointer"
          title="RGBA sliders"
        >
          RGBA
        </button>
      </div>
      {modalOpen && <RgbaModal value={value} onApply={onChange} onClose={() => setModalOpen(false)} />}
    </>
  );
}


const VALID_TRANSITIONS: Record<string, string[]> = {
  AWAITING_PAYMENT: ['PROCESSING'],
  PROCESSING:       ['SHIPPED', 'CANCELLED'],
  SHIPPED:          ['DELIVERED', 'CANCELLED'],
  DELIVERED:        [],
  CANCELLED:        [],
};

const STATUS_COLOR: Record<string, string> = {
  AWAITING_PAYMENT: 'text-amber-600',
  PROCESSING: 'text-blue-600',
  SHIPPED: 'text-indigo-600',
  DELIVERED: 'text-green-600',
  CANCELLED: 'text-muted',
};

const selectClass = 'border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors';
const searchClass = 'border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors';

// ── Orders ────────────────────────────────────────────────────────────────────

function AdminOrders() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [changingStatus, setChangingStatus] = useState<number | null>(null);
  const [trackingInput, setTrackingInput] = useState<Record<number, string>>({});
  const [savingTracking, setSavingTracking] = useState<number | null>(null);
  const [uploadingFactura, setUploadingFactura] = useState<number | null>(null);
  const [sendingFactura, setSendingFactura] = useState<number | null>(null);
  const [facturaSent, setFacturaSent] = useState<number | null>(null);

  useEffect(() => { load(); }, [statusFilter, countryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      let data: OrderView[];
      if (statusFilter) data = await api.admin.orders.byStatus(statusFilter);
      else if (countryFilter) data = await api.admin.orders.byCountry(countryFilter);
      else data = await api.admin.orders.list();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  const filtered = orders.filter(o => {
    if (search) {
      const q = search.toLowerCase();
      if (!String(o.id).includes(q) && !o.email.toLowerCase().includes(q)) return false;
    }
    if (dateFilter) {
      const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
      if (orderDate !== dateFilter) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCountryFilter(''); }}
            className={selectClass}
          >
            <option value="">{t('admin.orders.allStatuses')}</option>
            {['AWAITING_PAYMENT', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={countryFilter}
            onChange={e => { setCountryFilter(e.target.value); setStatusFilter(''); }}
            className={selectClass}
          >
            <option value="">{t('admin.orders.allCountries')}</option>
            {['CANADA', 'UNITED_STATES', 'MEXICO'].map(c => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.search.orderPlaceholder')}
            className={`${searchClass} flex-1 min-w-0`}
          />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className={searchClass}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#F0EDE8] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-center py-16">{t('admin.orders.empty')}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => (
            <div key={o.id} className="border border-border">
              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F7F5F0] transition-colors"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              >
                <span className="text-xs text-muted w-8 flex-shrink-0">#{o.id}</span>
                <span className="text-sm truncate flex-1 min-w-0">{o.firstName} {o.lastName}</span>
                <span className="text-sm text-muted hidden md:inline truncate max-w-[180px] flex-shrink-0" title={o.email}>{o.email}</span>
                <span className={`text-xs uppercase tracking-wider flex-shrink-0 ${STATUS_COLOR[o.status]}`}>
                  {o.status.replace('_', ' ')}
                </span>
                <span className="text-sm flex-shrink-0">${formatMoney(o.total)}</span>
                <span className="text-xs text-muted hidden sm:block flex-shrink-0">{new Date(o.createdAt).toLocaleDateString()}</span>
              </button>

              {expanded === o.id && (
                <div className="px-5 pb-5 border-t border-border">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.address')}</p>
                      <p>{o.addressLine1}{o.addressLine2 ? `, ${o.addressLine2}` : ''}</p>
                    </div>
                    {o.colonial && (
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.colonial')}</p>
                        <p>{o.colonial}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.city')}</p>
                      <p>{o.city}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.state')}</p>
                      <p>{o.state}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.postalCode')}</p>
                      <p>{o.postalCode}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.country')}</p>
                      <p>{o.country.replace('_', ' ')}</p>
                    </div>
                    {o.tracking && (
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.tracking')}</p>
                        <p>{o.tracking}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-widest text-muted mb-2">{t('admin.detail.items')}</p>
                    <div className="space-y-2">
                      {o.items.map((item, i) => {
                        const name = pickLocale(item.nameEn, item.nameFr, item.nameEs, i18n.language) || `#${item.itemId}`;
                        return (
                          <div key={i} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.imageUrl
                                ? item.resourceType === 'video'
                                  ? <video src={item.imageUrl} className="w-10 h-10 object-cover bg-[#F0EDE8] flex-shrink-0" autoPlay muted loop playsInline />
                                  : <img src={item.imageUrl} alt={name} className="w-10 h-10 object-cover bg-[#F0EDE8] flex-shrink-0" />
                                : <div className="w-10 h-10 bg-[#F0EDE8] flex-shrink-0" />
                              }
                              <div className="min-w-0">
                                <p className="text-sm truncate">{name}{item.sizeLabel ? ` · ${item.sizeLabel}` : ''}</p>
                                <p className="text-xs text-muted">×{item.quantity}</p>
                              </div>
                            </div>
                            <span className="text-sm flex-shrink-0">${formatMoney(item.unitPrice * item.quantity)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {o.status !== 'DELIVERED' && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <p className="text-xs uppercase tracking-widest text-muted">{t('admin.orders.setTracking')}</p>
                      <input
                        value={trackingInput[o.id] ?? o.tracking ?? ''}
                        onChange={e => setTrackingInput(prev => ({ ...prev, [o.id]: e.target.value }))}
                        placeholder={t('admin.orders.trackingPlaceholder')}
                        className="border border-border bg-cream px-3 py-1.5 text-xs outline-none focus:border-dark transition-colors flex-1 min-w-[140px]"
                      />
                      <button
                        onClick={async () => {
                          setSavingTracking(o.id);
                          try {
                            await api.admin.orders.setTracking(o.id, trackingInput[o.id] ?? o.tracking ?? '');
                            await load();
                          } finally {
                            setSavingTracking(null);
                          }
                        }}
                        disabled={savingTracking === o.id}
                        className="border border-border px-3 py-1.5 text-xs hover:bg-[#F7F5F0] transition-colors disabled:opacity-50"
                      >
                        {t('admin.orders.save')}
                      </button>
                      {savingTracking === o.id && <span className="text-xs text-muted">...</span>}
                    </div>
                  )}
                  {(VALID_TRANSITIONS[o.status]?.length ?? 0) > 0 && (
                    <div className="mt-4 flex items-center gap-3">
                      <p className="text-xs uppercase tracking-widest text-muted">{t('admin.orders.changeStatus')}</p>
                      <select
                        defaultValue=""
                        onChange={async e => {
                          const next = e.target.value;
                          if (!next) return;
                          setChangingStatus(o.id);
                          try {
                            if (next === 'CANCELLED') {
                              await api.orders.cancel(o.id);
                            } else {
                              await api.admin.orders.changeStatus(o.id, next);
                            }
                            await load();
                            setExpanded(null);
                          } finally {
                            setChangingStatus(null);
                          }
                        }}
                        disabled={changingStatus === o.id}
                        className="border border-border bg-cream px-3 py-1.5 text-xs outline-none focus:border-dark transition-colors disabled:opacity-50"
                      >
                        <option value="" disabled>—</option>
                        {VALID_TRANSITIONS[o.status].map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                      {changingStatus === o.id && <span className="text-xs text-muted">...</span>}
                    </div>
                  )}
                  {o.country === 'MEXICO' && o.facturaRequested && (
                    <div className="mt-4 border border-border bg-[#F7F5F0] px-3 py-2 text-xs space-y-0.5">
                      <p className="uppercase tracking-widest text-muted">{t('admin.orders.facturaRequested')}</p>
                      <p><span className="text-muted">{t('admin.orders.rfc')}:</span> {o.rfc ?? '—'}</p>
                      <p><span className="text-muted">{t('admin.orders.regimen')}:</span> {o.regimenFiscal?.replace(/^R/, '') ?? '—'}</p>
                      <p><span className="text-muted">{t('admin.orders.uso')}:</span> {o.cfdiUso ?? '—'}</p>
                    </div>
                  )}
                  {o.country === 'MEXICO' && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <p className="text-xs uppercase tracking-widest text-muted">{t('admin.orders.factura')}</p>
                      {o.facturaUrl && (
                        <>
                          <a
                            href={o.facturaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline text-muted hover:text-dark transition-colors"
                          >
                            {t('admin.orders.viewFactura')}
                          </a>
                          <button
                            onClick={async () => {
                              setSendingFactura(o.id);
                              try {
                                await api.admin.orders.sendFactura(o.id);
                                setFacturaSent(o.id);
                                setTimeout(() => setFacturaSent(null), 3000);
                              } finally {
                                setSendingFactura(null);
                              }
                            }}
                            disabled={sendingFactura === o.id}
                            className="border border-border px-3 py-1.5 text-xs hover:bg-[#F7F5F0] transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {sendingFactura === o.id ? '...' : facturaSent === o.id ? t('admin.orders.facturaSent') : t('admin.orders.sendFactura')}
                          </button>
                        </>
                      )}
                      <label className="border border-border px-3 py-1.5 text-xs hover:bg-[#F7F5F0] transition-colors cursor-pointer">
                        {uploadingFactura === o.id ? '...' : o.facturaUrl ? t('admin.orders.replaceFactura') : t('admin.orders.uploadFactura')}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          disabled={uploadingFactura === o.id}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingFactura(o.id);
                            try {
                              const updated = await api.admin.orders.uploadFactura(o.id, file);
                              setOrders(prev => prev.map(x => x.id === o.id ? updated : x));
                            } finally {
                              setUploadingFactura(null);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Item Modal ────────────────────────────────────────────────────────────────

interface ItemFormData {
  nameEn: string; nameFr: string; nameEs: string;
  descriptionEn: string; descriptionFr: string; descriptionEs: string;
  price: string;
  stock: string;
  discountPercent: string;
  categoryIds: number[];
  labelIds: number[];
  material: string;
  usmcaQualified: boolean;
  weightGrams: string;
  pricingFormula: PricingFormula;
  pricingWork: string;
  pricingMargin: string;
}

const emptyForm: ItemFormData = {
  nameEn: '', nameFr: '', nameEs: '',
  descriptionEn: '', descriptionFr: '', descriptionEs: '',
  price: '', stock: '', discountPercent: '', categoryIds: [], labelIds: [],
  material: 'SILVER', usmcaQualified: false, weightGrams: '',
  pricingFormula: 'NONE', pricingWork: '', pricingMargin: '',
};

/** Default markup applied over wholesale cost when dynamic pricing is first enabled. */
const DEFAULT_MARGIN_PERCENT = 83;

/**
 * Mirror of the backend formula:
 *   wholesale = (mxnPorGramo × factor + w) × gramos
 *   precio    = ceil10(wholesale × (1 + m / 100))
 */
const PRICING_FACTORS: Record<Exclude<PricingFormula, 'NONE'>, { factor: number; metal: 'gold' | 'silver' }> = {
  GOLD_10K: { factor: 0.445, metal: 'gold' },
  GOLD_14K: { factor: 0.616, metal: 'gold' },
  SILVER_925: { factor: 1, metal: 'silver' },
};

// ── Item sizes ──────────────────────────────────────────────────────────────

type SizeForm = { size: string; stock: string; weightGrams: string; price: string; descriptionEn: string; descriptionFr: string; descriptionEs: string };

const emptySizeForm: SizeForm = { size: '', stock: '', weightGrams: '', price: '', descriptionEn: '', descriptionFr: '', descriptionEs: '' };

// Module-scope so it isn't recreated each render (which would remount the inputs
// and drop focus on every keystroke).
function SizeFields({ value, onChange, isStatic, heading, hideStock }: {
  value: SizeForm; onChange: (f: SizeForm) => void; isStatic: boolean; heading?: string; hideStock?: boolean;
}) {
  const { t } = useTranslation();
  const inputClass = 'w-full border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors';
  return (
    <div className="border border-border p-3 space-y-2">
      {heading && <p className="text-[11px] uppercase tracking-widest text-muted">{heading}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-[11px] uppercase tracking-widest text-muted">{t('admin.sizes.name')}</label>
          <input value={value.size} onChange={e => onChange({ ...value, size: e.target.value })} placeholder={t('admin.sizes.namePlaceholder')} className={inputClass} />
        </div>
        {!hideStock && (
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted">{t('admin.modal.stock')}</label>
            <input type="number" min="0" value={value.stock} onChange={e => onChange({ ...value, stock: e.target.value })} className={inputClass} />
          </div>
        )}
        <div>
          <label className="text-[11px] uppercase tracking-widest text-muted">{t('admin.modal.weight')} (g)</label>
          <input type="number" min="0" step="0.001" value={value.weightGrams} onChange={e => onChange({ ...value, weightGrams: e.target.value })} className={inputClass} />
        </div>
        {isStatic ? (
          <div className="col-span-2">
            <label className="text-[11px] uppercase tracking-widest text-muted">{t('admin.modal.price')}</label>
            <input type="number" min="0" step="0.01" value={value.price} onChange={e => onChange({ ...value, price: e.target.value })} className={inputClass} />
          </div>
        ) : (
          <p className="col-span-2 text-[11px] text-muted">{t('admin.sizes.dynamicPriceNote')}</p>
        )}
      </div>
      <details>
        <summary className="text-[11px] uppercase tracking-widest text-muted cursor-pointer">{t('admin.sizes.descOverrides')}</summary>
        <div className="space-y-2 mt-2">
          <textarea placeholder="EN" rows={2} value={value.descriptionEn} onChange={e => onChange({ ...value, descriptionEn: e.target.value })} className={inputClass} />
          <textarea placeholder="FR" rows={2} value={value.descriptionFr} onChange={e => onChange({ ...value, descriptionFr: e.target.value })} className={inputClass} />
          <textarea placeholder="ES" rows={2} value={value.descriptionEs} onChange={e => onChange({ ...value, descriptionEs: e.target.value })} className={inputClass} />
        </div>
      </details>
    </div>
  );
}

/**
 * Stock editor, separate from the item/size edit form so an unrelated edit can
 * never clobber stock. "Adjust" applies a relative change atomically (always
 * safe under concurrent sales); "Set" writes an absolute value guarded by the
 * entity version, so it's rejected if a sale changed stock since load.
 */
function StockControls({ stock, version, onAdjust, onSet }: {
  stock: number;
  version: number;
  onAdjust: (delta: number) => Promise<void>;
  onSet: (value: number, version: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [delta, setDelta] = useState('');
  const [setVal, setSetVal] = useState(String(stock));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Keep the "set to" box in sync when stock changes underneath us (e.g. after an adjust).
  useEffect(() => { setSetVal(String(stock)); }, [stock]);

  const inp = 'w-24 border border-border bg-cream px-2 py-1.5 text-sm outline-none focus:border-dark';
  const btn = 'text-xs uppercase tracking-widest px-3 py-1.5 border border-dark hover:bg-dark hover:text-white transition-colors disabled:opacity-50 cursor-pointer';

  async function run(fn: () => Promise<void>) {
    setBusy(true); setMsg(null);
    try { await fn(); setDelta(''); }
    catch (e) {
      const code = (e as { code?: string }).code;
      setMsg(code === 'STOCK_VERSION_CONFLICT' ? t('admin.stock.conflict')
           : code === 'STOCK_NEGATIVE' ? t('admin.stock.negative')
           : t('admin.products.saveError'));
    } finally { setBusy(false); }
  }

  return (
    <div className="border border-border p-3 space-y-2">
      <p className="text-xs uppercase tracking-widest">{t('admin.stock.current')}: <span className="font-medium">{stock}</span></p>
      <div className="flex items-center gap-2 flex-wrap">
        <input type="number" value={delta} onChange={e => setDelta(e.target.value)} placeholder="±0" className={inp} />
        <button type="button" disabled={busy || delta === '' || parseInt(delta) === 0} onClick={() => run(() => onAdjust(parseInt(delta)))} className={btn}>{t('admin.stock.adjust')}</button>
        <span className="text-muted text-xs px-1">|</span>
        <input type="number" min="0" value={setVal} onChange={e => setSetVal(e.target.value)} className={inp} />
        <button type="button" disabled={busy || setVal === ''} onClick={() => run(() => onSet(parseInt(setVal), version))} className={btn}>{t('admin.stock.set')}</button>
      </div>
      {msg && <p className="text-xs text-red-500">{msg}</p>}
    </div>
  );
}

/**
 * Per-size CRUD inside the product edit modal. Sizes can only be added to a
 * saved item. Adding the first size also captures the item's original
 * configuration as a named size, so an item with sizes always has its original.
 */
function ItemSizesPanel({ item, pricingFormula, onSizesChanged }: {
  item: ItemView;
  pricingFormula: PricingFormula;
  onSizesChanged: (sizes: ItemSizeView[]) => void;
}) {
  const { t } = useTranslation();
  const [sizes, setSizes] = useState<ItemSizeView[]>(item.sizes ?? []);
  const [mode, setMode] = useState<'list' | 'add' | 'first' | number>('list');
  const [form, setForm] = useState<SizeForm>(emptySizeForm);
  const [origForm, setOrigForm] = useState<SizeForm>(emptySizeForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStatic = pricingFormula === 'NONE';

  function apply(updated: ItemSizeView[]) {
    setSizes(updated);
    onSizesChanged(updated);
  }

  function toReq(f: SizeForm): ItemSizeRequest {
    return {
      size: f.size.trim(),
      stock: parseInt(f.stock) || 0,
      weightGrams: parseFloat(f.weightGrams) || 0,
      price: isStatic ? (f.price ? parseFloat(f.price) : null) : null,
      pricingWork: null,
      descriptionEn: f.descriptionEn.trim() || null,
      descriptionFr: f.descriptionFr.trim() || null,
      descriptionEs: f.descriptionEs.trim() || null,
    };
  }

  function startAdd() {
    setError(null);
    setForm(emptySizeForm);
    if (sizes.length === 0) {
      // First size: prefill the "original" row from the item's current values.
      setOrigForm({
        size: '',
        stock: String(item.stock),
        weightGrams: String(item.weightGrams),
        price: isStatic ? String(item.price) : '',
        descriptionEn: item.descriptionEn ?? '',
        descriptionFr: item.descriptionFr ?? '',
        descriptionEs: item.descriptionEs ?? '',
      });
      setMode('first');
    } else {
      setMode('add');
    }
  }

  function startEdit(s: ItemSizeView) {
    setError(null);
    setForm({
      size: s.size,
      stock: String(s.stock),
      weightGrams: String(s.weightGrams),
      price: isStatic ? String(s.price) : '',
      descriptionEn: s.descriptionEn ?? '',
      descriptionFr: s.descriptionFr ?? '',
      descriptionEs: s.descriptionEs ?? '',
    });
    setMode(s.id);
  }

  async function submitAdd(reqs: ItemSizeRequest[]) {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.admin.items.addSizes(item.id, reqs);
      apply(updated.sizes);
      setMode('list');
    } catch {
      setError(t('admin.products.saveError'));
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit(sizeId: number) {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.admin.items.updateSize(item.id, sizeId, toReq(form));
      apply(updated.sizes);
      setMode('list');
    } catch {
      setError(t('admin.products.saveError'));
    } finally {
      setBusy(false);
    }
  }

  async function adjustSizeStock(sizeId: number, delta: number) {
    const u = await api.admin.items.adjustSizeStock(item.id, sizeId, delta);
    apply(u.sizes);
  }

  async function setSizeStock(sizeId: number, value: number, version: number) {
    const u = await api.admin.items.setSizeStock(item.id, sizeId, value, version);
    apply(u.sizes);
  }

  async function move(sizeId: number, dir: 'up' | 'down') {
    setBusy(true);
    setError(null);
    try {
      const updated = dir === 'up'
        ? await api.admin.items.moveSizeUp(item.id, sizeId)
        : await api.admin.items.moveSizeDown(item.id, sizeId);
      apply(updated.sizes);
    } catch {
      setError(t('admin.products.saveError'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(sizeId: number) {
    if (!window.confirm(t('admin.sizes.confirmDelete'))) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.admin.items.deleteSize(item.id, sizeId);
      apply(updated.sizes);
    } catch {
      setError(t('admin.products.saveError'));
    } finally {
      setBusy(false);
    }
  }

  const fieldsValid = (f: SizeForm) => f.size.trim() && f.weightGrams && f.stock !== '' && (!isStatic || f.price);

  const btn = 'text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors disabled:opacity-50';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs uppercase tracking-widest">{t('admin.sizes.title')}</label>
        {mode === 'list' && (
          <button type="button" onClick={startAdd} className={`${btn} border-dark bg-dark text-white hover:bg-gold`}>
            {t('admin.sizes.add')}
          </button>
        )}
      </div>

      {sizes.length > 0 && (
        <div className="space-y-1 mb-2">
          {sizes.map((s, idx) => (
            <div key={s.id}>
              <div className="flex items-center gap-2 text-sm border border-border px-3 py-2">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(s.id, 'up')} disabled={busy || idx === 0} className="text-xs border border-border px-1.5 py-0.5 hover:border-dark transition-colors disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(s.id, 'down')} disabled={busy || idx === sizes.length - 1} className="text-xs border border-border px-1.5 py-0.5 hover:border-dark transition-colors disabled:opacity-30">↓</button>
                </div>
                <span className="font-medium">{s.size}</span>
                <span className="text-muted text-xs">· {s.stock} {t('admin.modal.stock').toLowerCase()} · {s.weightGrams} g · ${formatMoney(s.price)}</span>
                <div className="ml-auto flex gap-2">
                  <button type="button" onClick={() => startEdit(s)} className="text-xs uppercase tracking-widest text-muted hover:text-dark">{t('admin.products.edit')}</button>
                  <button type="button" onClick={() => remove(s.id)} disabled={busy} className="text-xs uppercase tracking-widest text-red-500 hover:text-red-600 disabled:opacity-50">{t('admin.products.delete')}</button>
                </div>
              </div>
              {mode === s.id && (
                <div className="mt-1 space-y-2">
                  <SizeFields value={form} onChange={setForm} isStatic={isStatic} hideStock />
                  <StockControls
                    stock={s.stock}
                    version={s.version}
                    onAdjust={(d) => adjustSizeStock(s.id, d)}
                    onSet={(v, ver) => setSizeStock(s.id, v, ver)}
                  />
                  <div className="flex gap-2">
                    <button type="button" disabled={busy || !fieldsValid(form)} onClick={() => submitEdit(s.id)} className={`${btn} border-dark bg-dark text-white hover:bg-gold`}>{t('admin.modal.save')}</button>
                    <button type="button" onClick={() => setMode('list')} className={`${btn} border-border hover:border-dark`}>{t('admin.modal.cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sizes.length === 0 && mode === 'list' && (
        <p className="text-xs text-muted mb-2">{t('admin.sizes.none')}</p>
      )}

      {mode === 'add' && (
        <div className="space-y-2">
          <SizeFields value={form} onChange={setForm} isStatic={isStatic} heading={t('admin.sizes.newHeading')} />
          <div className="flex gap-2">
            <button type="button" disabled={busy || !fieldsValid(form)} onClick={() => submitAdd([toReq(form)])} className={`${btn} border-dark bg-dark text-white hover:bg-gold`}>{t('admin.modal.save')}</button>
            <button type="button" onClick={() => setMode('list')} className={`${btn} border-border hover:border-dark`}>{t('admin.modal.cancel')}</button>
          </div>
        </div>
      )}

      {mode === 'first' && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted">{t('admin.sizes.firstHint')}</p>
          <SizeFields value={origForm} onChange={setOrigForm} isStatic={isStatic} heading={t('admin.sizes.originalHeading')} />
          <SizeFields value={form} onChange={setForm} isStatic={isStatic} heading={t('admin.sizes.newHeading')} />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !fieldsValid(origForm) || !fieldsValid(form)}
              onClick={() => submitAdd([toReq(origForm), toReq(form)])}
              className={`${btn} border-dark bg-dark text-white hover:bg-gold`}
            >{t('admin.modal.save')}</button>
            <button type="button" onClick={() => setMode('list')} className={`${btn} border-border hover:border-dark`}>{t('admin.modal.cancel')}</button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

interface ItemModalProps {
  item?: ItemView;
  allLabels: LabelView[];
  allCategories: CategoryView[];
  onClose: () => void;
  onSaved: () => void;
}

function ItemModal({ item, allLabels, allCategories, onClose, onSaved }: ItemModalProps) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState<ItemFormData>(
    item
      ? {
          nameEn: item.nameEn ?? '', nameFr: item.nameFr ?? '', nameEs: item.nameEs ?? '',
          descriptionEn: item.descriptionEn ?? '', descriptionFr: item.descriptionFr ?? '', descriptionEs: item.descriptionEs ?? '',
          price: String(item.price), stock: String(item.stock),
          discountPercent: item.discountPercent != null ? String(item.discountPercent) : '',
          categoryIds: item.categories.map(c => c.id), labelIds: item.labels.map(l => l.id),
          material: item.material ?? '', usmcaQualified: item.usmcaQualified ?? false,
          weightGrams: item.weightGrams ? String(item.weightGrams) : '',
          pricingFormula: item.pricingFormula ?? 'NONE',
          pricingWork: item.pricingWork != null ? String(item.pricingWork) : '',
          pricingMargin: item.pricingMargin != null ? String(item.pricingMargin) : '',
        }
      : { ...emptyForm }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Item-level stock is managed through its own endpoints (not the general save),
  // so it can't be clobbered by an unrelated edit. Tracked here for live display.
  const [stockView, setStockView] = useState({ stock: item?.stock ?? 0, version: item?.version ?? 0 });
  const [pendingFiles, setPendingFiles] = useState<{ file: File; name: string; url: string }[]>([]);
  const [pendingPicks, setPendingPicks] = useState<{ publicId: string; resourceType: string; secureUrl: string }[]>([]);
  const [currentAssets, setCurrentAssets] = useState(item?.assets ?? []);
  const [browsingMedia, setBrowsingMedia] = useState(false);
  const [metalPrices, setMetalPrices] = useState<{ goldMxnPerGram: number | null; silverMxnPerGram: number | null } | null>(null);

  useEffect(() => {
    api.metalPrices().then(setMetalPrices).catch(() => setMetalPrices(null));
  }, []);
  const [weightUnit, setWeightUnit] = useState<'g' | 'oz'>('g');
  const fileRef = useRef<HTMLInputElement>(null);

  const OZ_TO_G = 28.3495;
  const weightInGrams = (): number => {
    const v = parseFloat(form.weightGrams) || 0;
    return weightUnit === 'oz' ? parseFloat((v * OZ_TO_G).toFixed(3)) : v;
  };

  const inputClass = 'w-full border border-border bg-cream px-4 py-3 text-sm outline-none focus:border-dark transition-colors';

  // Revoke any outstanding object URLs when the modal unmounts. A ref mirrors the
  // latest list so the mount-only cleanup sees whatever is still pending.
  const pendingFilesRef = useRef(pendingFiles);
  pendingFilesRef.current = pendingFiles;
  useEffect(() => () => pendingFilesRef.current.forEach(p => URL.revokeObjectURL(p.url)), []);

  // Queue newly picked files for upload on save. Appends rather than replaces, so
  // the admin can add media in several passes instead of one giant selection.
  function addPendingFiles(files: File[]) {
    const accepted = files.filter(file => {
      const limit = overSizeLimitMb(file);
      if (limit) alert(t('admin.site.fileTooLarge', { name: file.name, max: limit }));
      return !limit;
    });
    const entries = accepted.map(file => ({
      file,
      name: promptMediaName(file, t('admin.site.mediaNamePrompt')),
      url: URL.createObjectURL(file),
    }));
    setPendingFiles(prev => [...prev, ...entries]);
  }

  function removePendingFile(idx: number) {
    setPendingFiles(prev => {
      const removed = prev[idx];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function removePendingPick(idx: number) {
    setPendingPicks(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleDeleteAsset(assetId: number) {
    if (!item) return;
    try {
      const updated = await api.admin.items.deleteAsset(item.id, assetId);
      setCurrentAssets(updated.assets);
    } catch {
      setError(t('admin.products.saveError'));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: ItemRequest = {
        nameEn: form.nameEn, nameFr: form.nameFr, nameEs: form.nameEs,
        descriptionEn: form.descriptionEn, descriptionFr: form.descriptionFr, descriptionEs: form.descriptionEs,
        price: form.price ? parseFloat(form.price) : 0,
        stock: parseInt(form.stock),
        discountPercent: form.discountPercent ? parseInt(form.discountPercent) : null,
        categoryIds: form.categoryIds,
        labelIds: form.labelIds,
        material: form.material as JewelryMaterial,
        usmcaQualified: form.usmcaQualified,
        weightGrams: weightInGrams(),
        pricingFormula: form.pricingFormula === 'NONE' ? null : form.pricingFormula,
        pricingWork: form.pricingFormula !== 'NONE' && form.pricingWork ? parseFloat(form.pricingWork) : null,
        pricingMargin: form.pricingFormula !== 'NONE' && form.pricingMargin ? parseFloat(form.pricingMargin) : null,
      };
      let itemId: number;
      if (item) {
        await api.admin.items.update(item.id, payload);
        itemId = item.id;
      } else {
        const created = await api.admin.items.create(payload);
        itemId = created.id;
      }
      for (const { file, name } of pendingFiles) {
        await api.admin.items.addAsset(itemId, file, name);
      }
      for (const pick of pendingPicks) {
        await api.admin.items.pickAsset(itemId, pick);
      }
      onSaved();
    } catch {
      setError(t('admin.products.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-cream w-full max-w-lg max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
        <h2 className="font-serif text-2xl font-light mb-6">{item ? t('admin.modal.editTitle') : t('admin.modal.newTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.name')}</label>
            <div className="space-y-2">
              <input placeholder="EN" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className={inputClass} />
              <input placeholder="FR" value={form.nameFr} onChange={e => setForm(f => ({ ...f, nameFr: e.target.value }))} className={inputClass} />
              <input placeholder="ES" value={form.nameEs} onChange={e => setForm(f => ({ ...f, nameEs: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.description')}</label>
            <div className="space-y-2">
              <textarea placeholder="EN" value={form.descriptionEn} onChange={e => setForm(f => ({ ...f, descriptionEn: e.target.value }))} rows={2} className={inputClass} />
              <textarea placeholder="FR" value={form.descriptionFr} onChange={e => setForm(f => ({ ...f, descriptionFr: e.target.value }))} rows={2} className={inputClass} />
              <textarea placeholder="ES" value={form.descriptionEs} onChange={e => setForm(f => ({ ...f, descriptionEs: e.target.value }))} rows={2} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.price')}</label>
              <input
                type="number" step="0.01" min="0"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                required={form.pricingFormula === 'NONE'}
                disabled={form.pricingFormula !== 'NONE'}
                className={`${inputClass} ${form.pricingFormula !== 'NONE' ? 'opacity-50' : ''}`}
              />
            </div>
            {/* Initial stock only when creating; existing items manage stock via the control below. */}
            {!item && (
              <div>
                <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.stock')}</label>
                <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required className={inputClass} />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.discount')}</label>
              <input type="number" min="0" max="100" placeholder="0" value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.material')}</label>
              <select value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} required className={`${inputClass} appearance-none cursor-pointer`}>
                <option value="SILVER">{t('admin.modal.materialSilver')}</option>
                <option value="GOLD">{t('admin.modal.materialGold')}</option>
                <option value="STEEL">{t('admin.modal.materialSteel')}</option>
                <option value="OTHER">{t('admin.modal.materialOther')}</option>
              </select>
            </div>
          </div>
          {/* Existing item: dedicated stock management (single-option items only;
              sized items manage stock per size in the Sizes panel below). */}
          {item && (item.sizes?.length ?? 0) === 0 && (
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.stock')}</label>
              <StockControls
                stock={stockView.stock}
                version={stockView.version}
                onAdjust={async (d) => { const u = await api.admin.items.adjustStock(item.id, d); setStockView({ stock: u.stock, version: u.version }); }}
                onSet={async (v, ver) => { const u = await api.admin.items.setStock(item.id, v, ver); setStockView({ stock: u.stock, version: u.version }); }}
              />
            </div>
          )}
          {item && (item.sizes?.length ?? 0) > 0 && (
            <p className="text-xs text-muted">{t('admin.stock.managedPerSize')}</p>
          )}
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.weight')}</label>
            <div className="flex gap-2">
              <input
                type="number" min="0" step="0.001" placeholder="0"
                value={form.weightGrams}
                onChange={e => setForm(f => ({ ...f, weightGrams: e.target.value }))}
                className={`${inputClass} flex-1`}
                required
              />
              <button
                type="button"
                onClick={() => {
                  if (weightUnit === 'g') {
                    const gVal = parseFloat(form.weightGrams) || 0;
                    setForm(f => ({ ...f, weightGrams: gVal ? (gVal / OZ_TO_G).toFixed(3) : '' }));
                    setWeightUnit('oz');
                  } else {
                    const ozVal = parseFloat(form.weightGrams) || 0;
                    setForm(f => ({ ...f, weightGrams: ozVal ? (ozVal * OZ_TO_G).toFixed(3) : '' }));
                    setWeightUnit('g');
                  }
                }}
                className="border border-border px-4 py-2 text-xs uppercase tracking-widest hover:border-dark transition-colors min-w-[52px]"
              >
                {weightUnit === 'g' ? 'g' : 'oz'}
              </button>
            </div>
            {form.weightGrams && (
              <p className="text-xs text-muted mt-1">
                {weightUnit === 'g'
                  ? `${(parseFloat(form.weightGrams) / OZ_TO_G).toFixed(3)} oz`
                  : `${(parseFloat(form.weightGrams) * OZ_TO_G).toFixed(3)} g`}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.dynamicPricing')}</label>
            <div className="flex gap-2">
              <select
                value={form.pricingFormula}
                onChange={e => {
                  const next = e.target.value as PricingFormula;
                  setForm(f => ({
                    ...f,
                    pricingFormula: next,
                    // Prefill the default markup the first time dynamic pricing is turned on.
                    pricingMargin: f.pricingFormula === 'NONE' && next !== 'NONE' && !f.pricingMargin
                      ? String(DEFAULT_MARGIN_PERCENT)
                      : f.pricingMargin,
                  }));
                }}
                className={`${inputClass} flex-1 appearance-none cursor-pointer`}
              >
                <option value="NONE">{t('admin.modal.dynamicPricingNone')}</option>
                <option value="GOLD_10K">{t('admin.modal.dynamicPricing10k')}</option>
                <option value="GOLD_14K">{t('admin.modal.dynamicPricing14k')}</option>
                <option value="SILVER_925">{t('admin.modal.dynamicPricing925')}</option>
              </select>
              {form.pricingFormula !== 'NONE' && (
                <input
                  type="number" min="0" step="0.01"
                  placeholder={t('admin.modal.dynamicWork')}
                  value={form.pricingWork}
                  onChange={e => setForm(f => ({ ...f, pricingWork: e.target.value }))}
                  className={`${inputClass} flex-1`}
                />
              )}
              {form.pricingFormula !== 'NONE' && (
                <input
                  type="number" min="0" step="0.1"
                  placeholder={t('admin.modal.dynamicMargin')}
                  value={form.pricingMargin}
                  onChange={e => setForm(f => ({ ...f, pricingMargin: e.target.value }))}
                  className={`${inputClass} flex-1`}
                />
              )}
            </div>
            {form.pricingFormula !== 'NONE' && (() => {
              const cfg = PRICING_FACTORS[form.pricingFormula as Exclude<PricingFormula, 'NONE'>];
              const perGram = cfg.metal === 'gold' ? metalPrices?.goldMxnPerGram : metalPrices?.silverMxnPerGram;
              if (perGram == null) {
                return <p className="text-xs text-muted mt-1">{t('admin.modal.dynamicPriceUnavailable')}</p>;
              }
              const grams = weightInGrams();
              const w = parseFloat(form.pricingWork) || 0;
              const m = parseFloat(form.pricingMargin) || 0;
              const wholesale = (perGram * cfg.factor + w) * grams;
              const computed = Math.ceil(wholesale * (1 + m / 100) / 10) * 10;
              return (
                <div className="text-xs text-muted mt-1 space-y-0.5">
                  <p>
                    {t('admin.modal.dynamicWholesalePreview')}: <span className="font-medium text-dark">${formatMoney(wholesale)} MXN</span>
                    {' '}({perGram.toFixed(2)} MXN/g × {cfg.factor} + {w}) × {grams} g
                  </p>
                  <p>
                    {t('admin.modal.dynamicPricePreview')}: <span className="font-medium text-dark">${formatMoney(computed)} MXN</span>
                    {' '}(+{m}%)
                  </p>
                </div>
              );
            })()}
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.usmcaQualified}
              onChange={e => setForm(f => ({ ...f, usmcaQualified: e.target.checked }))}
              className="accent-dark"
            />
            <span className="text-xs uppercase tracking-widest">{t('admin.modal.usmcaQualified')}</span>
          </label>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.categories')}</label>
            {allCategories.length === 0 ? (
              <p className="text-xs text-muted">{t('admin.categories.empty')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allCategories.map(c => (
                  <label key={c.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.categoryIds.includes(c.id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        categoryIds: e.target.checked
                          ? [...f.categoryIds, c.id]
                          : f.categoryIds.filter(id => id !== c.id),
                      }))}
                    />
                    {pickLocale(c.nameEn, c.nameFr, c.nameEs, i18n.language)}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.labels')}</label>
            {allLabels.length === 0 ? (
              <p className="text-xs text-muted">{t('admin.labels.empty')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allLabels.map(label => (
                  <label key={label.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.labelIds.includes(label.id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        labelIds: e.target.checked
                          ? [...f.labelIds, label.id]
                          : f.labelIds.filter(id => id !== label.id),
                      }))}
                    />
                    {pickLocale(label.nameEn, label.nameFr, label.nameEs, i18n.language)}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.media')}</label>
            {(currentAssets.length > 0 || pendingFiles.length > 0 || pendingPicks.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-3">
                {currentAssets.map(asset => (
                  <div key={asset.id} className="relative group w-20 h-20">
                    {asset.resourceType === 'video' ? (
                      <div className="w-20 h-20 bg-[#F0EDE8] flex items-center justify-center text-xs text-muted uppercase tracking-widest">video</div>
                    ) : (
                      <img src={asset.imageUrl ?? ''} alt="" className="w-20 h-20 object-cover" />
                    )}
                    {item && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="absolute top-0.5 right-0.5 bg-dark text-white text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >×</button>
                    )}
                  </div>
                ))}
                {pendingFiles.map((pf, idx) => (
                  <div key={pf.url} className="relative group w-20 h-20 ring-1 ring-gold">
                    {pf.file.type.startsWith('video') ? (
                      <div className="w-20 h-20 bg-[#F0EDE8] flex items-center justify-center text-xs text-muted uppercase tracking-widest">video</div>
                    ) : (
                      <img src={pf.url} alt={pf.name} className="w-20 h-20 object-cover" />
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-gold/90 text-dark text-[9px] uppercase tracking-widest text-center py-px">{t('admin.modal.pendingBadge')}</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(idx)}
                      className="absolute top-0.5 right-0.5 bg-dark text-white text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >×</button>
                  </div>
                ))}
                {pendingPicks.map((pick, idx) => (
                  <div key={pick.publicId} className="relative group w-20 h-20 ring-1 ring-gold">
                    {pick.resourceType === 'video' ? (
                      <div className="w-20 h-20 bg-[#F0EDE8] flex items-center justify-center text-xs text-muted uppercase tracking-widest">video</div>
                    ) : (
                      <img src={pick.secureUrl} alt="" className="w-20 h-20 object-cover" />
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-gold/90 text-dark text-[9px] uppercase tracking-widest text-center py-px">{t('admin.modal.pendingBadge')}</span>
                    <button
                      type="button"
                      onClick={() => removePendingPick(idx)}
                      className="absolute top-0.5 right-0.5 bg-dark text-white text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={e => { addPendingFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors"
              >
                {t('admin.modal.addMedia')}
              </button>
              <button
                type="button"
                onClick={() => setBrowsingMedia(true)}
                className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors"
              >
                {t('admin.site.browse')}
              </button>
            </div>
          </div>

          {/* Sizes — only on saved items; adding the first size also captures the original */}
          <div>
            {item ? (
              <ItemSizesPanel item={item} pricingFormula={item.pricingFormula ?? 'NONE'} onSizesChanged={() => {}} />
            ) : (
              <>
                <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.sizes.title')}</label>
                <p className="text-xs text-muted">{t('admin.sizes.saveFirst')}</p>
              </>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-dark text-white text-xs uppercase tracking-widest py-3 hover:bg-gold transition-colors disabled:opacity-50">
              {saving ? '...' : t('admin.modal.save')}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-border text-xs uppercase tracking-widest py-3 hover:border-dark transition-colors">
              {t('admin.modal.cancel')}
            </button>
          </div>
        </form>
      </div>
      {browsingMedia && (
        <CloudinaryBrowserModal
          onClose={() => setBrowsingMedia(false)}
          onSelect={resource => {
            setBrowsingMedia(false);
            // Queue the pick and apply it on save, the same as uploaded files. This
            // makes Browse work for brand-new items that don't have an id yet, and
            // keeps a single "apply on save" flow for both new and existing items.
            setPendingPicks(prev =>
              prev.some(p => p.publicId === resource.publicId)
                ? prev
                : [...prev, { publicId: resource.publicId, resourceType: resource.resourceType, secureUrl: resource.secureUrl }]
            );
          }}
        />
      )}
    </div>
  );
}

// ── Products ──────────────────────────────────────────────────────────────────

type ProductSort = 'default' | 'sold' | 'soldMonth' | 'sales';

function AdminProducts() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<ItemViewVerbose[]>([]);
  const [labels, setLabels] = useState<LabelView[]>([]);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<ProductSort>('default');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'new' | ItemViewVerbose | null>(null);
  const [newLabel, setNewLabel] = useState({ nameEn: '', nameFr: '', nameEs: '' });
  const [newCategory, setNewCategory] = useState({ nameEn: '', nameFr: '', nameEs: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [itemData, labelData, categoryData] = await Promise.all([
        api.admin.items.listVerbose(),
        api.labels.list(),
        api.categories.list(),
      ]);
      setItems(itemData);
      setLabels(labelData);
      setCategories(categoryData);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLabel(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.nameEn && !newLabel.nameFr && !newLabel.nameEs) return;
    await api.admin.labels.create(newLabel);
    setNewLabel({ nameEn: '', nameFr: '', nameEs: '' });
    setLabels(await api.labels.list());
  }

  async function handleDeleteLabel(id: number) {
    if (!confirm(t('admin.labels.deleteConfirm'))) return;
    await api.admin.labels.delete(id);
    setLabels(await api.labels.list());
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.nameEn && !newCategory.nameFr && !newCategory.nameEs) return;
    await api.admin.categories.create(newCategory);
    setNewCategory({ nameEn: '', nameFr: '', nameEs: '' });
    setCategories(await api.categories.list());
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm(t('admin.categories.deleteConfirm'))) return;
    try {
      await api.admin.categories.delete(id);
      setCategories(await api.categories.list());
    } catch (err: any) {
      if (err?.status === 409 || err?.code === 'CATEGORY_HAS_ITEMS') {
        alert(t('admin.categories.deleteHasItems'));
      }
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t('admin.products.deleteConfirm'))) return;
    try {
      await api.admin.items.delete(id);
      load();
    } catch (err: any) {
      if (err?.status === 409 || err?.code === 'ITEM_HAS_ORDERS') {
        alert(t('admin.products.deleteHasOrders'));
      }
    }
  }

  const sorted = [...items]
    .filter(item => {
      if (!search) return true;
      const q = search.toLowerCase();
      return String(item.id).includes(q) ||
        [item.nameEn, item.nameFr, item.nameEs].some(n => n?.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sort === 'sold') return b.nbSold - a.nbSold;
      if (sort === 'soldMonth') return b.nbSoldMonth - a.nbSoldMonth;
      if (sort === 'sales') return b.totalSales - a.totalSales;
      return 0;
    });

  const sortBtn = (label: string, value: ProductSort) => (
    <button
      onClick={() => setSort(s => s === value ? 'default' : value)}
      className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
        sort === value ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {sortBtn(t('admin.products.sortBySold'), 'sold')}
            {sortBtn(t('admin.products.sortBySoldMonth'), 'soldMonth')}
            {sortBtn(t('admin.products.sortBySales'), 'sales')}
          </div>
          <button
            onClick={() => setModal('new')}
            className="bg-dark text-white text-xs uppercase tracking-widest px-6 py-3 hover:bg-gold transition-colors sm:flex-shrink-0"
          >
            {t('admin.products.addProduct')}
          </button>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.search.productPlaceholder')}
          className={`${searchClass} w-full`}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#F0EDE8] animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-muted text-center py-16">{t('admin.products.empty')}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(item => {
            const displayName = pickLocale(item.nameEn, item.nameFr, item.nameEs, i18n.language) || `#${item.id}`;
            const incomplete = isItemIncomplete(item);
            return (
            <div key={item.id} className={`border px-5 py-4 ${
              !item.active ? 'border-border opacity-60' : incomplete ? 'border-amber-400' : 'border-border'
            }`}>
              <div className="flex items-center gap-4">
                {item.assets?.[0]?.imageUrl
                  ? item.assets[0].resourceType === 'video'
                    ? <video src={item.assets[0].imageUrl!} className="w-12 h-12 object-cover flex-shrink-0" autoPlay muted loop playsInline />
                    : <img src={item.assets[0].imageUrl!} alt={displayName} className="w-12 h-12 object-cover flex-shrink-0" />
                  : <div className="w-12 h-12 bg-[#F0EDE8] flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{displayName}</p>
                    {!item.active && <span className="text-[10px] uppercase tracking-widest border border-muted text-muted px-1.5 py-0.5">{t('admin.products.inactive')}</span>}
                    {incomplete && <span className="text-[10px] uppercase tracking-widest border border-amber-400 text-amber-600 px-1.5 py-0.5">{t('admin.products.incomplete')}</span>}
                    {!!item.discountPercent && <span className="text-[10px] uppercase tracking-widest border border-gold text-gold px-1.5 py-0.5">-{item.discountPercent}%</span>}
                    {item.material && <span className="text-[10px] uppercase tracking-widest border border-border text-muted px-1.5 py-0.5">{item.material}</span>}
                    {item.usmcaQualified && <span className="text-[10px] uppercase tracking-widest border border-green-600 text-green-700 px-1.5 py-0.5">USMCA</span>}
                  </div>
                  <p className="text-xs text-muted">{item.categories.map(c => pickLocale(c.nameEn, c.nameFr, c.nameEs, i18n.language)).join(', ')} · {item.discountPercent ? `$${formatMoney(Number(item.price) * (1 - item.discountPercent / 100))} ` : ''}<span className={item.discountPercent ? 'line-through' : ''}>${formatMoney(item.price)}</span> · {item.stock} {t('admin.products.inStock')}</p>
                  <p className="text-xs text-muted">
                    {item.nbSold} {t('admin.products.sold')} ({item.nbSoldMonth} {t('admin.products.thisMonth')}) · ${formatMoney(item.totalSalesMonth)} {t('admin.products.thisMonth')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => setModal(item)} className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors">
                  {t('admin.products.edit')}
                </button>
                {item.active ? (
                  <button onClick={() => api.admin.items.deactivate(item.id).then(load)} className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors">
                    {t('admin.products.deactivate')}
                  </button>
                ) : (
                  <button onClick={() => api.admin.items.activate(item.id).then(load)} className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors">
                    {t('admin.products.activate')}
                  </button>
                )}
                <button onClick={() => handleDelete(item.id)} className="text-xs uppercase tracking-widest border border-red-300 text-red-500 px-3 py-1.5 hover:border-red-500 transition-colors">
                  {t('admin.products.delete')}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-border">
        <p className="text-xs uppercase tracking-widest mb-4">{t('admin.labels.title')}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {labels.length === 0 ? (
            <p className="text-xs text-muted">{t('admin.labels.empty')}</p>
          ) : labels.map(label => {
            const incomplete = isLabelIncomplete(label);
            return (
              <span key={label.id} className={`flex items-center gap-1.5 border px-3 py-1 text-xs ${incomplete ? 'border-amber-400 text-amber-700' : 'border-border'}`}>
                {pickLocale(label.nameEn, label.nameFr, label.nameEs, i18n.language)}
                {incomplete && <span className="text-amber-500">!</span>}
                <button
                  onClick={() => handleDeleteLabel(label.id)}
                  className="text-muted hover:text-dark transition-colors leading-none"
                  aria-label="delete"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
        <form onSubmit={handleAddLabel} className="flex flex-wrap gap-2 items-center">
          <input
            value={newLabel.nameEn}
            onChange={e => setNewLabel(l => ({ ...l, nameEn: e.target.value }))}
            placeholder="EN"
            className={`${searchClass} w-28`}
          />
          <input
            value={newLabel.nameFr}
            onChange={e => setNewLabel(l => ({ ...l, nameFr: e.target.value }))}
            placeholder="FR"
            className={`${searchClass} w-28`}
          />
          <input
            value={newLabel.nameEs}
            onChange={e => setNewLabel(l => ({ ...l, nameEs: e.target.value }))}
            placeholder="ES"
            className={`${searchClass} w-28`}
          />
          <button
            type="submit"
            className="border border-border text-xs uppercase tracking-widest px-4 py-2 hover:border-dark transition-colors"
          >
            {t('admin.labels.add')}
          </button>
        </form>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs uppercase tracking-widest mb-4">{t('admin.categories.title')}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.length === 0 ? (
            <p className="text-xs text-muted">{t('admin.categories.empty')}</p>
          ) : categories.map(cat => (
            <span key={cat.id} className="flex items-center gap-1.5 border border-border px-3 py-1 text-xs">
              {pickLocale(cat.nameEn, cat.nameFr, cat.nameEs, i18n.language)}
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="text-muted hover:text-dark transition-colors leading-none"
                aria-label="delete"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2 items-center">
          <input
            value={newCategory.nameEn}
            onChange={e => setNewCategory(c => ({ ...c, nameEn: e.target.value }))}
            placeholder="EN"
            className={`${searchClass} w-28`}
          />
          <input
            value={newCategory.nameFr}
            onChange={e => setNewCategory(c => ({ ...c, nameFr: e.target.value }))}
            placeholder="FR"
            className={`${searchClass} w-28`}
          />
          <input
            value={newCategory.nameEs}
            onChange={e => setNewCategory(c => ({ ...c, nameEs: e.target.value }))}
            placeholder="ES"
            className={`${searchClass} w-28`}
          />
          <button
            type="submit"
            className="border border-border text-xs uppercase tracking-widest px-4 py-2 hover:border-dark transition-colors"
          >
            {t('admin.categories.add')}
          </button>
        </form>
      </div>

      {modal !== null && (
        <ItemModal
          item={modal === 'new' ? undefined : modal}
          allLabels={labels}
          allCategories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

    </div>
  );
}

// ── Collections ───────────────────────────────────────────────────────────────

type CollectionModal = 'new' | CollectionView;

const COLLECTION_ASSET_SLOTS = ['hero', 'editorial1', 'editorial2', 'editorial3', 'editorial4'] as const;
const COLLECTION_SLOT_LABELS: Record<string, string> = {
  hero: 'admin.site.slots.hero',
  editorial1: 'admin.site.slots.editorial1',
  editorial2: 'admin.site.slots.editorial2',
  editorial3: 'admin.site.slots.editorial3',
  editorial4: 'admin.site.slots.editorial4',
};

function CollectionFormModal({
  initial,
  labels,
  categories,
  onClose,
  onSaved,
}: {
  initial?: CollectionView;
  labels: LabelView[];
  categories: CategoryView[];
  onClose: () => void;
  onSaved: (c: CollectionView) => void;
}) {
  const { t, i18n } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [browsingCard, setBrowsingCard] = useState(false);
  const [pickedMedia, setPickedMedia] = useState<{ publicId: string; resourceType: string; secureUrl: string } | null>(null);
  const [form, setForm] = useState({
    labelIds: initial?.labels.map(l => l.id) ?? [],
    categoryIds: initial?.categories.map(c => c.id) ?? [],
    headerEn: initial?.headerEn ?? '',
    headerFr: initial?.headerFr ?? '',
    headerEs: initial?.headerEs ?? '',
    subheaderEn: initial?.subheaderEn ?? '',
    subheaderFr: initial?.subheaderFr ?? '',
    subheaderEs: initial?.subheaderEs ?? '',
    color: initial?.color ?? '',
  });

  const set = (k: string, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        labelIds: form.labelIds,
        categoryIds: form.categoryIds,
        headerEn: form.headerEn,
        headerFr: form.headerFr,
        headerEs: form.headerEs,
        subheaderEn: form.subheaderEn,
        subheaderFr: form.subheaderFr,
        subheaderEs: form.subheaderEs,
        color: form.color,
      };
      let saved: CollectionView;
      if (initial) {
        saved = await api.admin.collections.updateText(initial.id, payload);
      } else {
        saved = await api.admin.collections.create(payload);
      }
      if (file) {
        saved = await api.admin.collections.uploadImage(saved.id, file, fileName ?? undefined);
      } else if (pickedMedia) {
        saved = await api.admin.collections.pickMedia(saved.id, pickedMedia);
      }
      onSaved(saved);
    } catch {
      setError(t('admin.collections.saveError'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-cream w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 space-y-4">
        <h2 className="font-serif text-2xl font-light">
          {initial ? t('admin.collections.editTitle') : t('admin.collections.newTitle')}
        </h2>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted block mb-2">{t('admin.modal.labels')}</label>
          {labels.length === 0 ? (
            <p className="text-xs text-muted">{t('admin.labels.empty')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {labels.map(label => (
                <label key={label.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.labelIds.includes(label.id)}
                    onChange={e => setForm(f => ({
                      ...f,
                      labelIds: e.target.checked
                        ? [...f.labelIds, label.id]
                        : f.labelIds.filter(id => id !== label.id),
                    }))}
                  />
                  {pickLocale(label.nameEn, label.nameFr, label.nameEs, i18n.language)}
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted block mb-2">{t('admin.modal.categories')}</label>
          {categories.length === 0 ? (
            <p className="text-xs text-muted">{t('admin.categories.empty')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(cat.id)}
                    onChange={e => setForm(f => ({
                      ...f,
                      categoryIds: e.target.checked
                        ? [...f.categoryIds, cat.id]
                        : f.categoryIds.filter(id => id !== cat.id),
                    }))}
                  />
                  {pickLocale(cat.nameEn, cat.nameFr, cat.nameEs, i18n.language)}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-muted block mb-1">EN</label>
            <input value={form.headerEn} onChange={e => set('headerEn', e.target.value)} placeholder={t('admin.modal.name')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">FR</label>
            <input value={form.headerFr} onChange={e => set('headerFr', e.target.value)} placeholder={t('admin.modal.name')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">ES</label>
            <input value={form.headerEs} onChange={e => set('headerEs', e.target.value)} placeholder={t('admin.modal.name')} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-muted block mb-1">EN</label>
            <input value={form.subheaderEn} onChange={e => set('subheaderEn', e.target.value)} placeholder={t('admin.site.subheaderPlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">FR</label>
            <input value={form.subheaderFr} onChange={e => set('subheaderFr', e.target.value)} placeholder={t('admin.site.subheaderPlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">ES</label>
            <input value={form.subheaderEs} onChange={e => set('subheaderEs', e.target.value)} placeholder={t('admin.site.subheaderPlaceholder')} className={inputClass} />
          </div>
        </div>

        <ColorInput
          value={form.color}
          onChange={v => set('color', v)}
          placeholder={t('admin.site.colorPlaceholder')}
        />

        <div>
          <label className="text-xs uppercase tracking-widest text-muted block mb-1">{t('admin.modal.image')}</label>
          {(pickedMedia?.secureUrl ?? initial?.imageUrl) && (
            (pickedMedia?.resourceType ?? initial?.resourceType) === 'video'
              ? <video src={pickedMedia?.secureUrl ?? initial!.imageUrl!} className="w-24 h-16 object-cover mb-2" autoPlay muted loop playsInline />
              : <img src={pickedMedia?.secureUrl ?? initial!.imageUrl!} alt="" className="w-24 h-16 object-cover mb-2" />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = '';
              if (f) {
                const limit = overSizeLimitMb(f);
                if (limit) { alert(t('admin.site.fileTooLarge', { name: f.name, max: limit })); return; }
              }
              setPickedMedia(null);
              setFile(f);
              setFileName(f ? promptMediaName(f, t('admin.site.mediaNamePrompt')) : null);
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border border-dark bg-dark text-white text-xs uppercase tracking-widest px-4 py-2 hover:bg-gold transition-colors"
            >
              {file ? file.name : t('admin.site.upload')}
            </button>
            <button
              type="button"
              onClick={() => setBrowsingCard(true)}
              className="border border-border text-xs uppercase tracking-widest px-4 py-2 hover:border-dark transition-colors"
            >
              {t('admin.site.browse')}
            </button>
          </div>
          {pickedMedia && (
            <p className="text-xs text-muted mt-1 font-mono truncate">{pickedMedia.publicId}</p>
          )}
        </div>
        {browsingCard && (
          <CloudinaryBrowserModal
            onSelect={r => { setPickedMedia({ publicId: r.publicId, resourceType: r.resourceType, secureUrl: r.secureUrl }); setFile(null); setBrowsingCard(false); }}
            onClose={() => setBrowsingCard(false)}
          />
        )}

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-dark text-white text-xs uppercase tracking-widest px-6 py-3 hover:bg-gold transition-colors disabled:opacity-50"
          >
            {saving ? '...' : t('admin.modal.save')}
          </button>
          <button
            onClick={onClose}
            className="border border-border text-xs uppercase tracking-widest px-6 py-3 hover:border-dark transition-colors"
          >
            {t('admin.modal.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cloudinary Browser Modal ──────────────────────────────────────────────────

function CloudinaryBrowserModal({ onSelect, onClose }: {
  onSelect: (resource: CloudinaryResource) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'image' | 'video'>('image');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState<CloudinaryResourcesPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load(type: 'image' | 'video', nextCursor?: string) {
    setLoading(true);
    try {
      const result = await api.admin.cloudinary.list(type, nextCursor);
      setPage(prev => nextCursor && prev
        ? { resources: [...prev.resources, ...result.resources], nextCursor: result.nextCursor }
        : result);
    } finally { setLoading(false); }
  }

  useEffect(() => { setPage(null); load(tab); }, [tab]);

  async function handleDelete(resource: CloudinaryResource) {
    if (!confirm(t('admin.site.browseDeleteConfirm'))) return;
    setDeleting(resource.publicId);
    try {
      await api.admin.cloudinary.delete(resource.publicId, resource.resourceType);
      setPage(prev => prev
        ? { ...prev, resources: prev.resources.filter(r => r.publicId !== resource.publicId) }
        : prev);
    } finally { setDeleting(null); }
  }

  async function handleRename(resource: CloudinaryResource) {
    const entered = window.prompt(t('admin.site.mediaNamePrompt'), resource.displayName ?? resource.publicId);
    const name = entered?.trim();
    if (!name || name === (resource.displayName ?? resource.publicId)) return;
    await api.admin.cloudinary.rename(resource.publicId, resource.resourceType, name);
    setPage(prev => prev
      ? { ...prev, resources: prev.resources.map(r => r.publicId === resource.publicId ? { ...r, displayName: name } : r) }
      : prev);
  }

  const filtered = (page?.resources ?? []).filter(r =>
    !search || (r.displayName ?? '').toLowerCase().includes(search.toLowerCase())
    || r.publicId.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-[#FAFAF8] border border-[#E8E4DC] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E4DC]">
          <p className="text-xs uppercase tracking-widest font-medium">{t('admin.site.browseTitle')}</p>
          <button onClick={onClose} className="text-muted hover:text-dark text-lg leading-none">✕</button>
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#E8E4DC]">
          <div className="flex gap-1">
            {(['image', 'video'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTab(type)}
                className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${tab === type ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
              >
                {t(type === 'image' ? 'admin.site.browseImages' : 'admin.site.browseVideos')}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.site.browseSearch')}
            className="flex-1 border border-border bg-cream px-3 py-1.5 text-sm outline-none focus:border-dark transition-colors"
          />
        </div>

        {/* Resource list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
          {loading && !page && (
            <p className="text-xs text-muted text-center py-6">...</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-muted text-center py-6">{t('admin.site.browseEmpty')}</p>
          )}
          {filtered.map(resource => (
            <div key={resource.publicId} className="flex items-center gap-3 border border-border px-3 py-2 hover:border-dark transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono truncate">{resource.displayName ?? resource.publicId}</p>
                <p className="text-xs text-muted mt-0.5">
                  {resource.format.toUpperCase()} · {(resource.bytes / 1024).toFixed(0)} KB · {resource.createdAt?.slice(0, 10)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onSelect(resource)}
                  className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-3 py-1 hover:bg-gold transition-colors"
                >
                  {t('admin.site.browseSelect')}
                </button>
                <button
                  onClick={() => handleRename(resource)}
                  className="text-xs uppercase tracking-widest border border-border px-3 py-1 hover:border-dark transition-colors"
                >
                  {t('admin.site.browseRename')}
                </button>
                <button
                  onClick={() => handleDelete(resource)}
                  disabled={deleting === resource.publicId}
                  className="text-xs uppercase tracking-widest border border-red-300 text-red-500 px-3 py-1 hover:border-red-500 transition-colors disabled:opacity-50"
                >
                  {deleting === resource.publicId ? '...' : t('admin.site.browseDelete')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        {page?.nextCursor && (
          <div className="px-5 py-3 border-t border-[#E8E4DC]">
            <button
              onClick={() => load(tab, page.nextCursor!)}
              disabled={loading}
              className="text-xs uppercase tracking-widest border border-border px-4 py-1.5 w-full hover:border-dark transition-colors disabled:opacity-50"
            >
              {loading ? '...' : t('admin.site.browseLoadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionAssetsPanel({ collectionId, siteAssets, labels, categories, onUpdate }: {
  collectionId: number;
  siteAssets: CollectionSiteAssetView[];
  labels: LabelView[];
  categories: CategoryView[];
  onUpdate: (updated: CollectionSiteAssetView) => void;
}) {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [browsingSlot, setBrowsingSlot] = useState<string | null>(null);
  const [textForm, setTextForm] = useState<{ headerEn: string; headerFr: string; headerEs: string; subheaderEn: string; subheaderFr: string; subheaderEs: string; taglineEn: string; taglineFr: string; taglineEs: string; color: string; headerColor: string; subheaderColor: string; taglineColor: string; ctaCategoryIds: number[]; ctaLabelIds: number[] }>({ headerEn: '', headerFr: '', headerEs: '', subheaderEn: '', subheaderFr: '', subheaderEs: '', taglineEn: '', taglineFr: '', taglineEs: '', color: '', headerColor: '', subheaderColor: '', taglineColor: '', ctaCategoryIds: [], ctaLabelIds: [] });

  function openEdit(asset: CollectionSiteAssetView) {
    setEditing(asset.slot);
    setTextForm({
      headerEn: asset.headerEn ?? '',
      headerFr: asset.headerFr ?? '',
      headerEs: asset.headerEs ?? '',
      subheaderEn: asset.subheaderEn ?? '',
      subheaderFr: asset.subheaderFr ?? '',
      subheaderEs: asset.subheaderEs ?? '',
      taglineEn: asset.taglineEn ?? '',
      taglineFr: asset.taglineFr ?? '',
      taglineEs: asset.taglineEs ?? '',
      color: asset.color ?? '',
      headerColor: asset.headerColor ?? '',
      subheaderColor: asset.subheaderColor ?? '',
      taglineColor: asset.taglineColor ?? '',
      ctaCategoryIds: asset.ctaCategoryIds ?? [],
      ctaLabelIds: asset.ctaLabelIds ?? [],
    });
  }

  async function saveText(slot: string) {
    setSaving(true);
    try {
      const updated = await api.admin.collections.updateAsset(collectionId, slot, {
        headerEn: textForm.headerEn,
        headerFr: textForm.headerFr,
        headerEs: textForm.headerEs,
        subheaderEn: textForm.subheaderEn,
        subheaderFr: textForm.subheaderFr,
        subheaderEs: textForm.subheaderEs,
        taglineEn: textForm.taglineEn || null,
        taglineFr: textForm.taglineFr || null,
        taglineEs: textForm.taglineEs || null,
        color: textForm.color,
        headerColor: textForm.headerColor || null,
        subheaderColor: textForm.subheaderColor || null,
        taglineColor: textForm.taglineColor || null,
        ctaCategoryIds: textForm.ctaCategoryIds,
        ctaLabelIds: textForm.ctaLabelIds,
      });
      onUpdate(updated);
      setEditing(null);
    } finally { setSaving(false); }
  }

  async function handleUpload(slot: string, file: File, name: string) {
    setUploading(slot);
    try {
      const updated = await api.admin.collections.uploadAssetImage(collectionId, slot, file, name);
      onUpdate(updated);
    } catch {
      alert(t('admin.site.uploadFailed'));
    } finally { setUploading(null); }
  }

  async function handleDeleteMedia(slot: string) {
    setUploading(slot);
    try {
      const updated = await api.admin.collections.deleteAssetImage(collectionId, slot);
      onUpdate(updated);
    } finally { setUploading(null); }
  }

  async function handlePickResource(slot: string, resource: CloudinaryResource) {
    setBrowsingSlot(null);
    setUploading(slot);
    try {
      const updated = await api.admin.collections.pickAsset(collectionId, slot, {
        publicId: resource.publicId,
        resourceType: resource.resourceType,
        secureUrl: resource.secureUrl,
      });
      onUpdate(updated);
    } finally { setUploading(null); }
  }

  const slotMap = Object.fromEntries(siteAssets.map(a => [a.slot, a]));

  return (
    <div className="border-t border-border bg-[#FAF9F7] space-y-2 p-4">
      <p className="text-xs uppercase tracking-widest text-muted mb-2">{t('admin.collections.assets')}</p>
      {COLLECTION_ASSET_SLOTS.map(slot => {
        const asset = slotMap[slot];
        if (!asset) return null;
        return (
          <div key={slot} className="border border-border">
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-11 bg-[#F0EDE8] shrink-0 overflow-hidden flex items-center justify-center">
                  {asset.imageUrl
                    ? asset.resourceType === 'video'
                      ? <video src={asset.imageUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      : <img src={asset.imageUrl} alt={slot} className="w-full h-full object-cover" />
                    : <span className="text-muted text-xs">—</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium uppercase tracking-widest">{t(COLLECTION_SLOT_LABELS[slot] ?? slot)}</p>
                  {(asset.headerEn || asset.subheaderEn) && (
                    <p className="text-xs text-muted truncate mt-0.5">
                      {[asset.headerEn, asset.subheaderEn].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => editing === slot ? setEditing(null) : openEdit(asset)}
                  className={`text-xs uppercase tracking-widest border px-3 py-1 transition-colors ${editing === slot ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
                >
                  {t('admin.site.edit')}
                </button>
                <label className={`text-xs uppercase tracking-widest border border-dark bg-dark text-white px-3 py-1 cursor-pointer hover:bg-gold transition-colors ${uploading === slot ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading === slot ? '...' : t('admin.site.upload')}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f) return;
                      const limit = overSizeLimitMb(f);
                      if (limit) { alert(t('admin.site.fileTooLarge', { name: f.name, max: limit })); return; }
                      handleUpload(slot, f, promptMediaName(f, t('admin.site.mediaNamePrompt')));
                    }}
                  />
                </label>
                <button
                  onClick={() => setBrowsingSlot(slot)}
                  disabled={uploading === slot}
                  className="text-xs uppercase tracking-widest border border-border px-3 py-1 hover:border-dark transition-colors disabled:opacity-50"
                >
                  {t('admin.site.browse')}
                </button>
                {asset.imageId && (
                  <button
                    onClick={() => handleDeleteMedia(slot)}
                    disabled={uploading === slot}
                    className="text-xs uppercase tracking-widest border border-red-300 text-red-500 px-3 py-1 hover:border-red-500 transition-colors disabled:opacity-50"
                  >
                    {t('admin.site.remove')}
                  </button>
                )}
              </div>
            </div>
            {editing === slot && (
              <div className="border-t border-border p-3 space-y-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted uppercase tracking-widest">{t('admin.site.headerPlaceholder')}</p>
                  <input value={textForm.headerEn} onChange={e => setTextForm(f => ({ ...f, headerEn: e.target.value }))} placeholder="EN" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                  <input value={textForm.headerFr} onChange={e => setTextForm(f => ({ ...f, headerFr: e.target.value }))} placeholder="FR" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                  <input value={textForm.headerEs} onChange={e => setTextForm(f => ({ ...f, headerEs: e.target.value }))} placeholder="ES" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted uppercase tracking-widest">{t('admin.site.subheaderPlaceholder')}</p>
                  <input value={textForm.subheaderEn} onChange={e => setTextForm(f => ({ ...f, subheaderEn: e.target.value }))} placeholder="EN" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                  <input value={textForm.subheaderFr} onChange={e => setTextForm(f => ({ ...f, subheaderFr: e.target.value }))} placeholder="FR" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                  <input value={textForm.subheaderEs} onChange={e => setTextForm(f => ({ ...f, subheaderEs: e.target.value }))} placeholder="ES" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted uppercase tracking-widest">{t('admin.site.taglinePlaceholder')}</p>
                  <input value={textForm.taglineEn} onChange={e => setTextForm(f => ({ ...f, taglineEn: e.target.value }))} placeholder="EN" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                  <input value={textForm.taglineFr} onChange={e => setTextForm(f => ({ ...f, taglineFr: e.target.value }))} placeholder="FR" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                  <input value={textForm.taglineEs} onChange={e => setTextForm(f => ({ ...f, taglineEs: e.target.value }))} placeholder="ES" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">{t('admin.site.headerColor')}</p>
                    <ColorInput value={textForm.headerColor} onChange={v => setTextForm(f => ({ ...f, headerColor: v }))} placeholder="#FFFFFF" />
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">{t('admin.site.subheaderColor')}</p>
                    <ColorInput value={textForm.subheaderColor} onChange={v => setTextForm(f => ({ ...f, subheaderColor: v }))} placeholder="#FFFFFF" />
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">{t('admin.site.taglineColor')}</p>
                    <ColorInput value={textForm.taglineColor} onChange={v => setTextForm(f => ({ ...f, taglineColor: v }))} placeholder="#FFFFFF" />
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">{t('admin.site.ctaBorderColor')}</p>
                    <ColorInput value={textForm.color} onChange={v => setTextForm(f => ({ ...f, color: v }))} placeholder="#FFFFFF" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">{t('admin.site.ctaCategory')}</p>
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted">{t('admin.categories.empty')}</p>
                    ) : (
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                        {categories.map(c => (
                          <label key={c.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={textForm.ctaCategoryIds.includes(c.id)}
                              onChange={e => setTextForm(f => ({
                                ...f,
                                ctaCategoryIds: e.target.checked
                                  ? [...f.ctaCategoryIds, c.id]
                                  : f.ctaCategoryIds.filter(id => id !== c.id),
                              }))}
                            />
                            {pickLocale(c.nameEn, c.nameFr, c.nameEs, i18n.language)}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">{t('admin.site.ctaLabel')}</p>
                    {labels.length === 0 ? (
                      <p className="text-xs text-muted">{t('admin.site.noneOption')}</p>
                    ) : (
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                        {labels.map(l => (
                          <label key={l.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={textForm.ctaLabelIds.includes(l.id)}
                              onChange={e => setTextForm(f => ({
                                ...f,
                                ctaLabelIds: e.target.checked
                                  ? [...f.ctaLabelIds, l.id]
                                  : f.ctaLabelIds.filter(id => id !== l.id),
                              }))}
                            />
                            {pickLocale(l.nameEn, l.nameFr, l.nameEs, i18n.language)}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => saveText(slot)} disabled={saving} className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-4 py-1.5 hover:bg-gold transition-colors disabled:opacity-50">
                    {saving ? '...' : t('admin.site.save')}
                  </button>
                  <button onClick={() => setEditing(null)} className="text-xs uppercase tracking-widest border border-border px-4 py-1.5 hover:border-dark transition-colors">
                    {t('admin.site.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {browsingSlot && (
        <CloudinaryBrowserModal
          onSelect={resource => handlePickResource(browsingSlot, resource)}
          onClose={() => setBrowsingSlot(null)}
        />
      )}
    </div>
  );
}

function CollectionThemePanel({ collectionId, currentTheme, onUpdate }: {
  collectionId: number;
  currentTheme: CollectionThemeView | null;
  onUpdate: (theme: CollectionThemeView | null) => void;
}) {
  const { t } = useTranslation();
  const { theme: globalTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  const EMPTY_THEME: CollectionThemeView = {
    navbarBg: null, navbarText: null, navbarTextSelected: null, navbarTextInactive: null,
    announcementBg: null, announcementText: null,
    siteBg: null, siteText: null,
    cardText: null, cardButtonBg: null, cardButtonText: null,
    navbarSeparator: null, siteTextMuted: null, siteTextAccent: null, siteSeparator: null,
  };

  const [form, setForm] = useState<CollectionThemeView>(() =>
    currentTheme ?? { ...EMPTY_THEME }
  );

  function setColor(key: keyof CollectionThemeView, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.admin.collections.updateTheme(collectionId, form);
      onUpdate(updated);
    } finally { setSaving(false); }
  }

  async function handleReset() {
    if (!confirm(t('admin.collections.theme.resetConfirm'))) return;
    await api.admin.collections.resetTheme(collectionId);
    setForm({ ...EMPTY_THEME });
    onUpdate(null);
  }

  function handleCopyGlobal() {
    setForm({
      navbarBg: globalTheme.navbarBg,
      navbarText: globalTheme.navbarText,
      navbarTextSelected: globalTheme.navbarTextSelected,
      navbarTextInactive: globalTheme.navbarTextInactive,
      announcementBg: globalTheme.announcementBg,
      announcementText: globalTheme.announcementText,
      siteBg: globalTheme.siteBg,
      siteText: globalTheme.siteText,
      cardText: globalTheme.cardText,
      cardButtonBg: globalTheme.cardButtonBg,
      cardButtonText: globalTheme.cardButtonText,
      navbarSeparator: globalTheme.navbarSeparator,
      siteTextMuted: globalTheme.siteTextMuted,
      siteTextAccent: globalTheme.siteTextAccent,
      siteSeparator: globalTheme.siteSeparator,
    });
  }

  return (
    <div className="border-t border-border bg-[#FAF9F7] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-muted">{t('admin.collections.theme.title')}</p>
        <button
          onClick={handleCopyGlobal}
          className="text-xs uppercase tracking-widest border border-border px-3 py-1 hover:border-dark transition-colors"
        >
          {t('admin.collections.theme.copyGlobal')}
        </button>
      </div>

      {THEME_SECTIONS.map(section => (
        <div key={section.titleKey}>
          <p className="text-xs uppercase tracking-widest text-muted mb-2">{t(section.titleKey)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {section.fields.map(field => (
              <div key={field.key}>
                <p className="text-xs text-muted mb-1">{t(field.labelKey)}</p>
                <ColorInput
                  value={form[field.key]}
                  onChange={v => setColor(field.key, v)}
                  placeholder={globalTheme[field.key] ?? '#000000'}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-4 py-1.5 hover:bg-gold transition-colors disabled:opacity-50">
          {saving ? '...' : t('admin.theme.save')}
        </button>
        {currentTheme && (
          <button onClick={handleReset} className="text-xs uppercase tracking-widest border border-red-300 text-red-500 px-4 py-1.5 hover:border-red-500 transition-colors">
            {t('admin.collections.theme.reset')}
          </button>
        )}
      </div>
    </div>
  );
}

function AdminCollections() {
  const { t, i18n } = useTranslation();
  const [collections, setCollections] = useState<CollectionView[]>([]);
  const [labels, setLabels] = useState<LabelView[]>([]);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [modal, setModal] = useState<CollectionModal | null>(null);
  const [expandedAssets, setExpandedAssets] = useState<number | null>(null);
  const [expandedTheme, setExpandedTheme] = useState<number | null>(null);
  const [togglingActive, setTogglingActive] = useState<number | null>(null);
  const [settingMain, setSettingMain] = useState<number | null>(null);

  useEffect(() => {
    loadCollections();
    api.labels.list().then(setLabels).catch(() => []);
    api.categories.list().then(setCategories).catch(() => []);
  }, []);

  async function loadCollections() {
    const data = await api.admin.collections.list().catch(() => []);
    setCollections(data);
  }

  async function handleDelete(id: number) {
    if (!confirm(t('admin.collections.deleteConfirm'))) return;
    await api.admin.collections.delete(id);
    setExpandedAssets(prev => prev === id ? null : prev);
    setExpandedTheme(prev => prev === id ? null : prev);
    loadCollections();
  }

  async function handleDeleteImage(id: number) {
    await api.admin.collections.deleteImage(id);
    loadCollections();
  }

  async function handleToggleActive(c: CollectionView) {
    setTogglingActive(c.id);
    try {
      const updated = await api.admin.collections.setActive(c.id, !c.active);
      setCollections(prev => prev.map(x => x.id === c.id ? updated : x));
    } finally { setTogglingActive(null); }
  }

  async function handleSetMain(id: number) {
    setSettingMain(id);
    try {
      await api.admin.collections.setMain(id);
      window.location.reload();
    } finally { setSettingMain(null); }
  }

  function handleAssetUpdate(collectionId: number, updated: CollectionSiteAssetView) {
    setCollections(prev => prev.map(c =>
      c.id === collectionId
        ? { ...c, siteAssets: c.siteAssets.map(a => a.slot === updated.slot ? updated : a) }
        : c
    ));
  }

  function handleThemeUpdate(collectionId: number, theme: CollectionThemeView | null) {
    setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, theme } : c));
  }

  return (
    <div className="mt-10 pt-8 border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest">{t('admin.collections.title')}</p>
          <p className="text-xs text-muted mt-1">{t('admin.collections.subtitle')}</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="bg-dark text-white text-xs uppercase tracking-widest px-4 py-2 hover:bg-gold transition-colors"
        >
          {t('admin.collections.addCollection')}
        </button>
      </div>

      {collections.length === 0 ? (
        <p className="text-xs text-muted">{t('admin.collections.empty')}</p>
      ) : (
        <div className="space-y-2">
          {collections.map(c => {
            const labelNames = c.labels.map(l => pickLocale(l.nameEn, l.nameFr, l.nameEs, i18n.language)).filter(Boolean).join(', ') || '—';
            const header = pickLocale(c.headerEn, c.headerFr, c.headerEs, i18n.language);
            const assetsOpen = expandedAssets === c.id;
            const themeOpen = expandedTheme === c.id;
            return (
              <div key={c.id} className={`border transition-opacity ${c.active || c.isMain ? 'border-border' : 'border-border opacity-60'}`}>
                <div className="px-5 py-4">
                  {/* Header row */}
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      {c.imageUrl
                        ? c.resourceType === 'video'
                          ? <video src={c.imageUrl} className="w-16 h-12 object-cover" autoPlay muted loop playsInline />
                          : <img src={c.imageUrl} alt={header || labelNames} className="w-16 h-12 object-cover" />
                        : <div className="w-16 h-12 bg-[#F0EDE8]" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{header || labelNames}</p>
                        {c.isMain && (
                          <span className="text-[10px] uppercase tracking-widest bg-dark text-white px-1.5 py-0.5 flex-shrink-0">
                            {t('admin.collections.isMain')}
                          </span>
                        )}
                        {!c.active && !c.isMain && (
                          <span className="text-[10px] uppercase tracking-widest border border-current text-muted px-1.5 py-0.5 flex-shrink-0">
                            {t('admin.collections.inactive')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5 truncate">{labelNames}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => setModal(c)}
                      className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors"
                    >
                      {t('admin.collections.editCard')}
                    </button>
                    <button
                      onClick={() => { setExpandedAssets(assetsOpen ? null : c.id); setExpandedTheme(null); }}
                      className={`text-xs uppercase tracking-widest border px-3 py-1.5 transition-colors ${assetsOpen ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
                    >
                      {t('admin.collections.assets')}
                    </button>
                    <button
                      onClick={() => { setExpandedTheme(themeOpen ? null : c.id); setExpandedAssets(null); }}
                      className={`text-xs uppercase tracking-widest border px-3 py-1.5 transition-colors ${themeOpen ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'}`}
                    >
                      {t('admin.collections.theme.button')}
                    </button>

                    {/* Set as main / main indicator */}
                    {c.isMain ? (
                      <span className="text-xs uppercase tracking-widest border border-dark px-3 py-1.5 text-dark select-none">
                        ★ {t('admin.collections.isMain')}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetMain(c.id)}
                        disabled={settingMain === c.id}
                        className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors disabled:opacity-50"
                      >
                        {settingMain === c.id ? '...' : t('admin.collections.setAsMain')}
                      </button>
                    )}

                    {/* Active toggle — controls visibility in the collections tab */}
                    <button
                      onClick={() => handleToggleActive(c)}
                      disabled={togglingActive === c.id}
                      className={`text-xs uppercase tracking-widest border px-3 py-1.5 transition-colors disabled:opacity-50 ${
                        c.active
                          ? 'border-border text-muted hover:border-dark'
                          : 'border-dark text-dark hover:bg-dark hover:text-white'
                      }`}
                    >
                      {togglingActive === c.id ? '...' : c.active ? t('admin.collections.deactivate') : t('admin.collections.activate')}
                    </button>

                    {c.imageUrl && (
                      <button
                        onClick={() => handleDeleteImage(c.id)}
                        className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors"
                      >
                        {t('admin.products.delImage')}
                      </button>
                    )}
                    {!c.isMain && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs uppercase tracking-widest border border-red-300 text-red-500 px-3 py-1.5 hover:border-red-500 transition-colors"
                      >
                        {t('admin.products.delete')}
                      </button>
                    )}
                  </div>
                </div>
                {assetsOpen && (
                  <CollectionAssetsPanel
                    collectionId={c.id}
                    siteAssets={c.siteAssets}
                    labels={labels}
                    categories={categories}
                    onUpdate={updated => handleAssetUpdate(c.id, updated)}
                  />
                )}
                {themeOpen && (
                  <CollectionThemePanel
                    collectionId={c.id}
                    currentTheme={c.theme}
                    onUpdate={theme => handleThemeUpdate(c.id, theme)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <CollectionFormModal
          initial={modal === 'new' ? undefined : modal}
          labels={labels}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadCollections(); }}
        />
      )}
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────

type UserSort = 'default' | 'money' | 'orders';

function VerboseRow({
  u,
  expanded,
  onToggle,
  children,
}: {
  u: VerboseClient;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="border border-border">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F5F0] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <span className="text-xs text-muted w-8 flex-shrink-0">#{u.id}</span>
          <span className="text-sm truncate">{u.firstName} {u.lastName}</span>
          <span className="text-sm text-muted hidden md:block truncate max-w-[180px]" title={u.email}>{u.email}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-sm text-muted">
          <span className="hidden sm:block">${formatMoney(u.moneySpent)}</span>
          <span>{u.nbSuccessfulOrders} {t('admin.users.ordersCount')}</span>
          <span className="text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.address')}</p>
              <p>{u.addressLine1}{u.addressLine2 ? `, ${u.addressLine2}` : ''}</p>
            </div>
            {u.colonial && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.colonial')}</p>
                <p>{u.colonial}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.city')}</p>
              <p>{u.city}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.state')}</p>
              <p>{u.state}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.postalCode')}</p>
              <p>{u.postalCode}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.phone')}</p>
              <p>{u.phoneNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.country')}</p>
              <p>{u.country?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.joined')}</p>
              <p>{new Date(u.createdOn).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.successfulOrders')}</p>
              <p>{u.nbSuccessfulOrders}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.moneySpent')}</p>
              <p>${formatMoney(u.moneySpent)}</p>
            </div>
            {u.stripeCustomerId && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.stripeId')}</p>
                <p className="text-xs font-mono truncate" title={u.stripeCustomerId ?? undefined}>{u.stripeCustomerId}</p>
              </div>
            )}
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<VerboseClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<UserSort>('default');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<number | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setUsers(await api.admin.users.listVerbose()); } finally { setLoading(false); }
  }

  function openPromote(id: number) {
    setPromoteTarget(id);
    setAdminPassword('');
    setPromoteError(null);
  }

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    if (!promoteTarget) return;
    setPromoting(true);
    setPromoteError(null);
    try {
      await api.admin.users.promote(promoteTarget, adminPassword);
      setPromoteTarget(null);
      setExpanded(null);
      setTimeout(load, 500);
    } catch {
      setPromoteError(t('admin.users.promoteError'));
    } finally {
      setPromoting(false);
    }
  }

  const sorted = [...users]
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return String(u.id).includes(q) || u.email.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === 'money') return b.moneySpent - a.moneySpent;
      if (sort === 'orders') return b.nbSuccessfulOrders - a.nbSuccessfulOrders;
      return 0;
    });

  const sortBtn = (label: string, value: UserSort) => (
    <button
      onClick={() => setSort(s => s === value ? 'default' : value)}
      className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
        sort === value ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2">
          {sortBtn(t('admin.users.sortByMoney'), 'money')}
          {sortBtn(t('admin.users.sortByOrders'), 'orders')}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.search.clientPlaceholder')}
          className={`${searchClass} w-full`}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#F0EDE8] animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-muted text-center py-16">{t('admin.users.empty')}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(u => (
            <VerboseRow
              key={u.id}
              u={u}
              expanded={expanded === u.id}
              onToggle={() => { setExpanded(expanded === u.id ? null : u.id); setPromoteTarget(null); }}
            >
              <div className="mt-4">
                {promoteTarget === u.id ? (
                  <form onSubmit={handlePromote} className="flex items-center gap-3">
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder={t('admin.users.passwordPlaceholder')}
                      required
                      autoFocus
                      className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={promoting}
                      className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-4 py-2 hover:bg-gold transition-colors disabled:opacity-50"
                    >
                      {promoting ? '...' : t('admin.users.confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoteTarget(null)}
                      className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-dark transition-colors"
                    >
                      {t('admin.users.cancel')}
                    </button>
                    {promoteError && <p className="text-red-500 text-sm">{promoteError}</p>}
                  </form>
                ) : (
                  <button
                    onClick={() => openPromote(u.id)}
                    className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-dark transition-colors"
                  >
                    {t('admin.users.promoteBtn')}
                  </button>
                )}
              </div>
            </VerboseRow>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admins ────────────────────────────────────────────────────────────────────

function AdminAdmins() {
  const { t } = useTranslation();
  const [admins, setAdmins] = useState<VerboseClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.admin.users.listAdmins()
      .then(setAdmins)
      .finally(() => setLoading(false));
  }, []);

  const filtered = admins.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return String(u.id).includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.search.clientPlaceholder')}
          className={`${searchClass} w-full`}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-[#F0EDE8] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-center py-16">{t('admin.admins.empty')}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <VerboseRow
              key={u.id}
              u={u}
              expanded={expanded === u.id}
              onToggle={() => setExpanded(expanded === u.id ? null : u.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Site Assets ───────────────────────────────────────────────────────────────


// ── Site ──────────────────────────────────────────────────────────────────────

type AnnouncementForm = {
  textEn: string; textFr: string; textEs: string; active: boolean;
  ctaType: 'none' | 'filter' | 'collection';
  ctaCategoryIds: number[]; ctaLabelIds: number[]; ctaCollectionId: number | null;
};

function emptyAnnouncementForm(): AnnouncementForm {
  return { textEn: '', textFr: '', textEs: '', active: true, ctaType: 'none', ctaCategoryIds: [], ctaLabelIds: [], ctaCollectionId: null };
}

function formFromAnnouncement(a: AnnouncementView): AnnouncementForm {
  let ctaType: AnnouncementForm['ctaType'] = 'none';
  if (a.ctaCollectionId != null) ctaType = 'collection';
  else if (a.ctaCategoryIds.length > 0 || a.ctaLabelIds.length > 0) ctaType = 'filter';
  return {
    textEn: a.textEn ?? '', textFr: a.textFr ?? '', textEs: a.textEs ?? '', active: a.active,
    ctaType, ctaCategoryIds: a.ctaCategoryIds ?? [], ctaLabelIds: a.ctaLabelIds ?? [], ctaCollectionId: a.ctaCollectionId,
  };
}

function formToRequest(f: AnnouncementForm) {
  return {
    textEn: f.textEn, textFr: f.textFr, textEs: f.textEs, active: f.active,
    ctaCategoryIds: f.ctaType === 'filter' ? f.ctaCategoryIds : [],
    ctaLabelIds: f.ctaType === 'filter' ? f.ctaLabelIds : [],
    ctaCollectionId: f.ctaType === 'collection' ? f.ctaCollectionId : null,
  };
}

function AnnouncementCtaFields({ form, setForm, categories, labels, collections }: {
  form: AnnouncementForm;
  setForm: React.Dispatch<React.SetStateAction<AnnouncementForm>>;
  categories: CategoryView[];
  labels: LabelView[];
  collections: CollectionView[];
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="space-y-2">
      <select value={form.ctaType} onChange={e => setForm(f => ({ ...f, ctaType: e.target.value as AnnouncementForm['ctaType'] }))}
        className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full">
        <option value="none">{t('admin.site.ctaNone')}</option>
        <option value="filter">{t('admin.site.ctaFilter')}</option>
        <option value="collection">{t('admin.site.ctaCollection')}</option>
      </select>
      {form.ctaType === 'filter' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-1">{t('admin.site.ctaCategory')}</p>
            {categories.length === 0 ? (
              <p className="text-xs text-muted">{t('admin.categories.empty')}</p>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {categories.map(c => (
                  <label key={c.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.ctaCategoryIds.includes(c.id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        ctaCategoryIds: e.target.checked
                          ? [...f.ctaCategoryIds, c.id]
                          : f.ctaCategoryIds.filter(id => id !== c.id),
                      }))}
                    />
                    {pickLocale(c.nameEn, c.nameFr, c.nameEs, i18n.language)}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-1">{t('admin.site.ctaLabel')}</p>
            {labels.length === 0 ? (
              <p className="text-xs text-muted">{t('admin.site.noneOption')}</p>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {labels.map(l => (
                  <label key={l.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.ctaLabelIds.includes(l.id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        ctaLabelIds: e.target.checked
                          ? [...f.ctaLabelIds, l.id]
                          : f.ctaLabelIds.filter(id => id !== l.id),
                      }))}
                    />
                    {pickLocale(l.nameEn, l.nameFr, l.nameEs, i18n.language)}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {form.ctaType === 'collection' && (
        <select value={form.ctaCollectionId ?? ''} onChange={e => setForm(f => ({ ...f, ctaCollectionId: Number(e.target.value) || null }))}
          className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full">
          <option value="">— {t('admin.site.ctaCollection')} —</option>
          {collections.map(c => <option key={c.id} value={c.id}>{pickLocale(c.headerEn, c.headerFr, c.headerEs, i18n.language) || `#${c.id}`}</option>)}
        </select>
      )}
    </div>
  );
}

function AdminSite() {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<AnnouncementView[]>([]);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [labels, setLabels] = useState<LabelView[]>([]);
  const [collections, setCollections] = useState<CollectionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<AnnouncementForm>(emptyAnnouncementForm());
  const [newForm, setNewForm] = useState<AnnouncementForm>(emptyAnnouncementForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const [a, cat, l, c] = await Promise.all([api.admin.announcements.list(), api.categories.list(), api.labels.list(), api.collections.list()]);
      setAnnouncements(a);
      setCategories(cat);
      setLabels(l);
      setCollections(c);
    } finally { setLoading(false); }
  }

  function openEdit(a: AnnouncementView) {
    setEditing(a.id);
    setEditForm(formFromAnnouncement(a));
  }

  async function saveEdit(id: number) {
    setSaving(true);
    try {
      await api.admin.announcements.update(id, formToRequest(editForm));
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm(t('admin.site.deleteConfirm'))) return;
    await api.admin.announcements.delete(id);
    await load();
  }

  async function handleMove(id: number, dir: 'up' | 'down') {
    const updated = dir === 'up'
      ? await api.admin.announcements.moveUp(id)
      : await api.admin.announcements.moveDown(id);
    setAnnouncements(updated);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.textEn && !newForm.textFr && !newForm.textEs) return;
    await api.admin.announcements.create(formToRequest(newForm));
    setNewForm(emptyAnnouncementForm());
    await load();
  }

  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-muted mb-6">{t('admin.site.announcementsTitle')}</h2>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-[#F0EDE8] animate-pulse" />)}</div>
      ) : announcements.length === 0 ? (
        <p className="text-muted text-center py-8">{t('admin.site.empty')}</p>
      ) : (
        <div className="space-y-2 mb-10">
          {announcements.map((a, idx) => (
            <div key={a.id} className={`border p-4 ${a.active ? 'border-border' : 'border-border opacity-50'}`}>
              {editing === a.id ? (
                <div className="space-y-2">
                  <input value={editForm.textEn} onChange={e => setEditForm(f => ({ ...f, textEn: e.target.value }))} placeholder="EN" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                  <input value={editForm.textFr} onChange={e => setEditForm(f => ({ ...f, textFr: e.target.value }))} placeholder="FR" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                  <input value={editForm.textEs} onChange={e => setEditForm(f => ({ ...f, textEs: e.target.value }))} placeholder="ES" className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
                  <AnnouncementCtaFields form={editForm} setForm={setEditForm} categories={categories} labels={labels} collections={collections} />
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input type="checkbox" checked={editForm.active} onChange={e => setEditForm(f => ({ ...f, active: e.target.checked }))} />
                      {t('admin.site.active')}
                    </label>
                    <button onClick={() => saveEdit(a.id)} disabled={saving} className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-4 py-2 hover:bg-gold transition-colors disabled:opacity-50">
                      {saving ? '...' : t('admin.site.save')}
                    </button>
                    <button onClick={() => setEditing(null)} className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-dark transition-colors">
                      {t('admin.site.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm">{a.textEn || <span className="text-muted italic">—</span>}</p>
                  {(a.textFr || a.textEs) && (
                    <p className="text-xs text-muted mt-1 truncate">{a.textFr}{a.textFr && a.textEs ? ' · ' : ''}{a.textEs}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <button onClick={() => handleMove(a.id, 'up')} disabled={idx === 0} className="text-xs border border-border px-2 py-1 hover:border-dark transition-colors disabled:opacity-30">↑</button>
                    <button onClick={() => handleMove(a.id, 'down')} disabled={idx === announcements.length - 1} className="text-xs border border-border px-2 py-1 hover:border-dark transition-colors disabled:opacity-30">↓</button>
                    <button onClick={() => openEdit(a)} className="text-xs uppercase tracking-widest border border-border px-3 py-1 hover:border-dark transition-colors">{t('admin.site.edit')}</button>
                    <button onClick={() => handleDelete(a.id)} className="text-xs uppercase tracking-widest border border-red-300 text-red-500 px-3 py-1 hover:border-red-500 transition-colors">{t('admin.site.delete')}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 className="text-xs uppercase tracking-widest text-muted mb-3">{t('admin.site.addTitle')}</h3>
      <form onSubmit={handleAdd} className="space-y-2">
        <input value={newForm.textEn} onChange={e => setNewForm(f => ({ ...f, textEn: e.target.value }))} placeholder={`${t('admin.site.textPlaceholder')} (EN)`} className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
        <input value={newForm.textFr} onChange={e => setNewForm(f => ({ ...f, textFr: e.target.value }))} placeholder={`${t('admin.site.textPlaceholder')} (FR)`} className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
        <input value={newForm.textEs} onChange={e => setNewForm(f => ({ ...f, textEs: e.target.value }))} placeholder={`${t('admin.site.textPlaceholder')} (ES)`} className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full" />
        <AnnouncementCtaFields form={newForm} setForm={setNewForm} categories={categories} labels={labels} collections={collections} />
        <button type="submit" className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-4 py-2 hover:bg-gold transition-colors">{t('admin.site.add')}</button>
      </form>
    </div>
  );
}

// ── Sales Stats ───────────────────────────────────────────────────────────────

function AdminStats() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [materials, setMaterials] = useState<MaterialSalesStats | null>(null);
  const [items, setItems] = useState<ItemViewVerbose[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'month' | 'quarter' | 'year' | 'total'>('month');

  useEffect(() => {
    Promise.all([api.admin.items.salesStats(), api.admin.items.materialSalesStats(), api.admin.items.listVerbose()])
      .then(([s, m, i]) => { setStats(s); setMaterials(m); setItems(i); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...items]
    .filter(i => i.active)
    .sort((a, b) => {
      if (sort === 'month') return b.totalSalesMonth - a.totalSalesMonth;
      if (sort === 'quarter') return b.totalSalesQuarter - a.totalSalesQuarter;
      if (sort === 'year') return b.totalSalesYear - a.totalSalesYear;
      return b.totalSales - a.totalSales;
    });

  const STRIPE_RATE = 0.036; // 3.6% — Stripe Mexico (MXN)
  const STRIPE_FLAT = 3.00;  // MXN $3.00 flat fee per transaction
  const stripeFee = (amount: number, orders: number) =>
    amount * STRIPE_RATE + orders * STRIPE_FLAT;

  const statCards = stats ? [
    { label: t('admin.stats.week'),    value: stats.week,    orders: stats.ordersWeek,    tax: stats.taxWeek },
    { label: t('admin.stats.month'),   value: stats.month,   orders: stats.ordersMonth,   tax: stats.taxMonth },
    { label: t('admin.stats.quarter'), value: stats.quarter, orders: stats.ordersQuarter, tax: stats.taxQuarter },
    { label: t('admin.stats.year'),    value: stats.year,    orders: stats.ordersYear,    tax: stats.taxYear },
    { label: t('admin.stats.allTime'), value: stats.total,   orders: stats.ordersTotal,   tax: stats.taxTotal },
  ] : [];

  const metalCards = materials ? [
    { label: t('admin.stats.metalGold10k'), bucket: materials.gold10k, showGrams: true },
    { label: t('admin.stats.metalGold14k'), bucket: materials.gold14k, showGrams: true },
    { label: t('admin.stats.metalSilver'),  bucket: materials.silver,  showGrams: true },
    { label: t('admin.stats.metalSteel'),   bucket: materials.steel,   showGrams: false },
    { label: t('admin.stats.metalOther'),   bucket: materials.other,   showGrams: true },
  ].filter(c => c.label !== t('admin.stats.metalOther') || c.bucket.units > 0) : [];

  const sortBtn = (label: string, value: typeof sort) => (
    <button
      onClick={() => setSort(value)}
      className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
        sort === value ? 'border-dark bg-dark text-white' : 'border-border hover:border-dark'
      }`}
    >
      {label}
    </button>
  );

  if (loading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#F0EDE8] animate-pulse" />)}</div>;

  return (
    <div className="space-y-10">
      {/* Overall stats */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted mb-4">{t('admin.stats.overallTitle')}</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map(card => (
            <div key={card.label} className="border border-border px-5 py-4">
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{card.label}</p>
              <p className="font-serif text-2xl font-light">${formatMoney(card.value)}</p>
              <p className="text-xs text-muted mt-1">{t('admin.stats.stripeFee', { amount: formatMoney(stripeFee(Number(card.value), card.orders)) })}</p>
              {Number(card.tax) > 0 && (
                <p className="text-xs text-muted mt-0.5">{t('admin.stats.taxes', { amount: formatMoney(card.tax) })}</p>
              )}
              <p className="text-xs font-medium mt-0.5">{t('admin.stats.stripeNet', { amount: formatMoney(Number(card.value) - stripeFee(Number(card.value), card.orders)) })}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">{t('admin.stats.stripeNote')}</p>
      </div>

      {/* Sales by metal */}
      {metalCards.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-4">{t('admin.stats.materialTitle')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metalCards.map(card => (
              <div key={card.label} className="border border-border px-5 py-4">
                <p className="text-xs uppercase tracking-widest text-muted mb-1">{card.label}</p>
                <p className="font-serif text-2xl font-light">${formatMoney(card.bucket.money)}</p>
                {card.showGrams && (
                  <p className="text-xs text-muted mt-1">{t('admin.stats.gramsSold', { grams: formatMoney(card.bucket.grams, 1) })}</p>
                )}
                <p className="text-xs text-muted mt-0.5">{t('admin.stats.piecesSold', { count: card.bucket.units })}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">{t('admin.stats.materialNote')}</p>
        </div>
      )}

      {/* Per-item breakdown */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <p className="text-xs uppercase tracking-widest text-muted">{t('admin.stats.itemBreakdown')}</p>
          <div className="flex flex-wrap gap-2">
            {sortBtn(t('admin.stats.month'), 'month')}
            {sortBtn(t('admin.stats.quarter'), 'quarter')}
            {sortBtn(t('admin.stats.year'), 'year')}
            {sortBtn(t('admin.stats.allTime'), 'total')}
          </div>
        </div>
        <div className="overflow-x-auto">
        <div className="border border-border divide-y divide-border min-w-[520px]">
          <div className="grid grid-cols-6 px-4 py-2 text-xs uppercase tracking-widest text-muted">
            <span className="col-span-2">{t('admin.stats.item')}</span>
            <span>{t('admin.stats.week')}</span>
            <span>{t('admin.stats.month')}</span>
            <span>{t('admin.stats.year')}</span>
            <span>{t('admin.stats.allTime')}</span>
          </div>
          {sorted.length === 0 ? (
            <p className="text-center text-sm text-muted py-8">{t('admin.stats.noData')}</p>
          ) : sorted.map(item => {
            const name = pickLocale(item.nameEn, item.nameFr, item.nameEs, i18n.language) || `#${item.id}`;
            return (
              <div key={item.id} className="grid grid-cols-6 px-4 py-3 text-sm items-center">
                <div className="col-span-2 flex items-center gap-3 min-w-0">
                  {item.assets?.[0]?.imageUrl
                    ? item.assets[0].resourceType === 'video'
                      ? <video src={item.assets[0].imageUrl!} className="w-8 h-8 object-cover flex-shrink-0" autoPlay muted loop playsInline />
                      : <img src={item.assets[0].imageUrl!} alt={name} className="w-8 h-8 object-cover flex-shrink-0" />
                    : <div className="w-8 h-8 bg-[#F0EDE8] flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="truncate">{name}</p>
                    <p className="text-xs text-muted">{item.nbSoldMonth} {t('admin.stats.unitsSoldMonth')} · {item.nbSold} {t('admin.stats.unitsSoldTotal')}</p>
                  </div>
                </div>
                <span>${formatMoney(item.totalSalesWeek)}</span>
                <span>${formatMoney(item.totalSalesMonth)}</span>
                <span>${formatMoney(item.totalSalesYear)}</span>
                <span>${formatMoney(item.totalSales)}</span>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

// ── Theme ─────────────────────────────────────────────────────────────────────

type ColorField = {
  key: keyof ThemeConfig;
  labelKey: string;
};

const THEME_SECTIONS: { titleKey: string; fields: ColorField[] }[] = [
  {
    titleKey: 'admin.theme.navbar',
    fields: [
      { key: 'navbarBg',           labelKey: 'admin.theme.navbarBg' },
      { key: 'navbarText',         labelKey: 'admin.theme.navbarText' },
      { key: 'navbarTextSelected', labelKey: 'admin.theme.navbarSelected' },
      { key: 'navbarTextInactive', labelKey: 'admin.theme.navbarInactive' },
      { key: 'navbarSeparator',    labelKey: 'admin.theme.navbarSeparator' },
    ],
  },
  {
    titleKey: 'admin.theme.announcement',
    fields: [
      { key: 'announcementBg',   labelKey: 'admin.theme.announcementBg' },
      { key: 'announcementText', labelKey: 'admin.theme.announcementText' },
    ],
  },
  {
    titleKey: 'admin.theme.site',
    fields: [
      { key: 'siteBg',         labelKey: 'admin.theme.siteBg' },
      { key: 'siteText',       labelKey: 'admin.theme.siteText' },
      { key: 'siteTextMuted',  labelKey: 'admin.theme.siteTextMuted' },
      { key: 'siteTextAccent', labelKey: 'admin.theme.siteTextAccent' },
      { key: 'siteSeparator',  labelKey: 'admin.theme.siteSeparator' },
    ],
  },
  {
    titleKey: 'admin.theme.card',
    fields: [
      { key: 'cardText',       labelKey: 'admin.theme.cardText' },
      { key: 'cardButtonBg',   labelKey: 'admin.theme.cardButtonBg' },
      { key: 'cardButtonText', labelKey: 'admin.theme.cardButtonText' },
    ],
  },
];

function AdminTheme() {
  const { t, i18n } = useTranslation();
  const { setTheme } = useTheme();
  const [homeCollection, setHomeCollection] = useState<CollectionView | null | undefined>(undefined);
  const [form, setForm] = useState<CollectionThemeView>({
    navbarBg: THEME_DEFAULTS.navbarBg, navbarText: THEME_DEFAULTS.navbarText,
    navbarTextSelected: THEME_DEFAULTS.navbarTextSelected, navbarTextInactive: THEME_DEFAULTS.navbarTextInactive,
    announcementBg: THEME_DEFAULTS.announcementBg, announcementText: THEME_DEFAULTS.announcementText,
    siteBg: THEME_DEFAULTS.siteBg, siteText: THEME_DEFAULTS.siteText,
    cardText: THEME_DEFAULTS.cardText, cardButtonBg: THEME_DEFAULTS.cardButtonBg, cardButtonText: THEME_DEFAULTS.cardButtonText,
    navbarSeparator: THEME_DEFAULTS.navbarSeparator, siteTextMuted: THEME_DEFAULTS.siteTextMuted,
    siteTextAccent: THEME_DEFAULTS.siteTextAccent, siteSeparator: THEME_DEFAULTS.siteSeparator,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.admin.collections.list().then(list => {
      const home = list.find(c => c.isMain) ?? null;
      setHomeCollection(home);
      if (home?.theme) {
        setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(home.theme!).filter(([, v]) => v != null)) }));
      }
    }).catch(() => setHomeCollection(null));
  }, []);

  function setColor(key: keyof CollectionThemeView, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!homeCollection) return;
    setSaving(true);
    try {
      const updated = await api.admin.collections.updateTheme(homeCollection.id, form);
      setForm({ ...form, ...Object.fromEntries(Object.entries(updated).filter(([, v]) => v != null)) });
      setTheme(mergeCollectionTheme(THEME_DEFAULTS, updated));
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm({
      navbarBg: THEME_DEFAULTS.navbarBg, navbarText: THEME_DEFAULTS.navbarText,
      navbarTextSelected: THEME_DEFAULTS.navbarTextSelected, navbarTextInactive: THEME_DEFAULTS.navbarTextInactive,
      announcementBg: THEME_DEFAULTS.announcementBg, announcementText: THEME_DEFAULTS.announcementText,
      siteBg: THEME_DEFAULTS.siteBg, siteText: THEME_DEFAULTS.siteText,
      cardText: THEME_DEFAULTS.cardText, cardButtonBg: THEME_DEFAULTS.cardButtonBg, cardButtonText: THEME_DEFAULTS.cardButtonText,
      navbarSeparator: THEME_DEFAULTS.navbarSeparator, siteTextMuted: THEME_DEFAULTS.siteTextMuted,
      siteTextAccent: THEME_DEFAULTS.siteTextAccent, siteSeparator: THEME_DEFAULTS.siteSeparator,
    });
  }

  const collectionName = homeCollection
    ? (pickLocale(homeCollection.headerEn, homeCollection.headerFr, homeCollection.headerEs, i18n.language) ?? `#${homeCollection.id}`)
    : null;

  return (
    <div className="space-y-8">
      {homeCollection === undefined ? (
        <div className="h-4 w-48 bg-[#F0EDE8] animate-pulse" />
      ) : homeCollection === null ? (
        <p className="text-xs uppercase tracking-widest text-muted">{t('admin.theme.noHome')}</p>
      ) : (
        <p className="text-xs uppercase tracking-widest text-muted">
          {t('admin.theme.editTitle', { name: collectionName })}
        </p>
      )}
      {homeCollection && THEME_SECTIONS.map(section => (
        <div key={section.titleKey}>
          <p className="text-xs uppercase tracking-widest text-muted mb-3">{t(section.titleKey)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.fields.map(field => (
              <div key={field.key}>
                <p className="text-xs text-muted mb-1">{t(field.labelKey)}</p>
                <ColorInput
                  value={form[field.key as keyof CollectionThemeView] ?? ''}
                  onChange={v => setColor(field.key as keyof CollectionThemeView, v)}
                  placeholder="#000000"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {homeCollection && (
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-4 py-2 hover:bg-gold transition-colors disabled:opacity-50">
            {saving ? '...' : t('admin.theme.save')}
          </button>
          <button onClick={handleReset} className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-dark transition-colors">
            {t('admin.theme.reset')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── AdminSettings ─────────────────────────────────────────────────────────────

function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [quota, setQuota] = useState<BrevoQuota | null | 'error'>('error');
  const [loading, setLoading] = useState(true);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => { load(); loadQuota(); }, []);

  async function load() {
    setLoading(true);
    try { setSettings(await api.admin.settings.get()); }
    finally { setLoading(false); }
  }

  async function loadQuota() {
    setQuotaLoading(true);
    try { setQuota(await api.admin.settings.brevoQuota()); }
    catch { setQuota('error'); }
    finally { setQuotaLoading(false); }
  }

  async function handleToggle() {
    if (!settings) return;
    setToggling(true);
    try { setSettings(await api.admin.settings.setRelay(!settings.smtpRelayEnabled)); }
    finally { setToggling(false); }
  }

  async function handleMsiToggle() {
    if (!settings) return;
    setToggling(true);
    try { setSettings(await api.admin.settings.setMsi(!settings.msiEnabled)); }
    finally { setToggling(false); }
  }

  async function handleStripeModeToggle() {
    if (!settings) return;
    setToggling(true);
    try { setSettings(await api.admin.settings.setStripeMode(!settings.stripeLiveMode)); }
    catch { alert(t('admin.settings.stripeLiveNotConfigured')); }
    finally { setToggling(false); }
  }

  const [shipForm, setShipForm] = useState<{ standard: string; extended: string; threshold: string } | null>(null);
  const [shipSaving, setShipSaving] = useState(false);
  const [shipSaved, setShipSaved] = useState(false);

  useEffect(() => {
    if (settings && shipForm === null) {
      setShipForm({
        standard: String(settings.standardShippingFee ?? ''),
        extended: String(settings.extendedShippingFee ?? ''),
        threshold: String(settings.freeShippingThreshold ?? ''),
      });
    }
  }, [settings, shipForm]);

  async function handleShippingSave(e: React.FormEvent) {
    e.preventDefault();
    if (!shipForm) return;
    setShipSaving(true);
    setShipSaved(false);
    try {
      const updated = await api.admin.settings.setShipping({
        standardShippingFee: Number(shipForm.standard),
        extendedShippingFee: Number(shipForm.extended),
        freeShippingThreshold: Number(shipForm.threshold),
      });
      setSettings(updated);
      setShipSaved(true);
    } finally {
      setShipSaving(false);
    }
  }

  const quotaPct = quota && quota !== 'error'
    ? Math.min(100, (quota.sentToday / quota.dailyLimit) * 100)
    : 0;

  return (
    <div className="max-w-lg space-y-8">
      <p className="text-xs uppercase tracking-widest text-muted">{t('admin.settings.title')}</p>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-[#F0EDE8] animate-pulse" />)}</div>
      ) : !settings ? null : (
        <>
          {/* Status + toggle */}
          <div className="flex items-center justify-between border border-border p-4">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${settings.smtpRelayEnabled ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className="text-sm">{settings.smtpRelayEnabled ? t('admin.settings.relayActive') : t('admin.settings.relayDisabled')}</span>
              {!settings.smtpRelayEnabled && settings.disabledReason && (
                <span className="text-xs text-muted">— {t(`admin.settings.reasons.${settings.disabledReason}`, { defaultValue: settings.disabledReason })}</span>
              )}
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`text-xs uppercase tracking-widest border px-4 py-2 transition-colors disabled:opacity-50 cursor-pointer ${
                settings.smtpRelayEnabled
                  ? 'border-red-300 text-red-500 hover:border-red-500'
                  : 'border-dark bg-dark text-white hover:bg-gold hover:border-gold'
              }`}
            >
              {toggling ? '...' : settings.smtpRelayEnabled ? t('admin.settings.disable') : t('admin.settings.enable')}
            </button>
          </div>

          {/* Brevo daily quota */}
          <div className="border border-border p-4 space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted mb-2">{t('admin.settings.quotaTitle')}</p>
            {quotaLoading ? (
              <p className="text-xs text-muted">{t('admin.settings.quotaLoading')}</p>
            ) : quota === 'error' || quota === null ? (
              <p className="text-xs text-red-400">{t('admin.settings.quotaError')}</p>
            ) : (
              <>
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>{t('admin.settings.quotaSent', { sent: quota.sentToday, limit: quota.dailyLimit })}</span>
                  <span>{t('admin.settings.quotaRemaining', { count: quota.remaining })}</span>
                </div>
                <div className="h-1.5 bg-[#F0EDE8] w-full">
                  <div
                    className={`h-full transition-all ${quotaPct >= 100 ? 'bg-red-400' : quotaPct >= 80 ? 'bg-amber-400' : 'bg-green-500'}`}
                    style={{ width: `${quotaPct}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* MSI toggle */}
          <div className="flex items-center justify-between border border-border p-4">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${settings.msiEnabled ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className="text-sm">{settings.msiEnabled ? t('admin.settings.msiActive') : t('admin.settings.msiDisabled')}</span>
            </div>
            <button
              onClick={handleMsiToggle}
              disabled={toggling}
              className={`text-xs uppercase tracking-widest border px-4 py-2 transition-colors disabled:opacity-50 cursor-pointer ${
                settings.msiEnabled
                  ? 'border-red-300 text-red-500 hover:border-red-500'
                  : 'border-dark bg-dark text-white hover:bg-gold hover:border-gold'
              }`}
            >
              {toggling ? '...' : settings.msiEnabled ? t('admin.settings.disable') : t('admin.settings.enable')}
            </button>
          </div>

          {/* Stripe mode toggle (test / live) */}
          <div className={`border p-4 ${settings.stripeLiveMode ? 'border-red-400 bg-red-50' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${settings.stripeLiveMode ? 'bg-red-500' : 'bg-amber-400'}`} />
                <span className="text-sm">
                  {settings.stripeLiveMode ? t('admin.settings.stripeLive') : t('admin.settings.stripeTest')}
                </span>
              </div>
              <button
                onClick={handleStripeModeToggle}
                disabled={toggling || (!settings.stripeLiveMode && !settings.stripeLiveConfigured)}
                className={`text-xs uppercase tracking-widest border px-4 py-2 transition-colors disabled:opacity-50 cursor-pointer ${
                  settings.stripeLiveMode
                    ? 'border-dark bg-dark text-white hover:bg-gold hover:border-gold'
                    : 'border-red-400 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500'
                }`}
              >
                {toggling ? '...' : settings.stripeLiveMode ? t('admin.settings.stripeSwitchTest') : t('admin.settings.stripeSwitchLive')}
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              {settings.stripeLiveMode
                ? t('admin.settings.stripeLiveWarning')
                : settings.stripeLiveConfigured
                  ? t('admin.settings.stripeTestHint')
                  : t('admin.settings.stripeLiveNotConfigured')}
            </p>
          </div>

          {/* Shipping fees (MXN) */}
          {shipForm && (
            <form onSubmit={handleShippingSave} className="border border-border p-4 space-y-4">
              <p className="text-xs uppercase tracking-widest text-muted">{t('admin.settings.shippingTitle')}</p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  ['standard', 'admin.settings.shippingStandard'],
                  ['extended', 'admin.settings.shippingExtended'],
                  ['threshold', 'admin.settings.shippingThreshold'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs text-muted mb-1">{t(label)}</label>
                    <input
                      type="number" min="0" step="0.01" required
                      value={shipForm[key]}
                      onChange={e => { setShipSaved(false); setShipForm(f => f ? { ...f, [key]: e.target.value } : f); }}
                      className="w-full border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={shipSaving}
                  className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-4 py-2 hover:bg-gold hover:border-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {shipSaving ? '...' : t('admin.settings.shippingSave')}
                </button>
                {shipSaved && <span className="text-xs text-green-600">{t('admin.settings.shippingSaved')}</span>}
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'orders' | 'products' | 'stats' | 'users' | 'admins' | 'site' | 'theme' | 'settings';

export default function Admin() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('orders');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'orders', label: t('admin.tabs.orders') },
    { key: 'products', label: t('admin.tabs.products') },
    { key: 'stats', label: t('admin.tabs.stats') },
    { key: 'users', label: t('admin.tabs.users') },
    { key: 'admins', label: t('admin.tabs.admins') },
    { key: 'site', label: t('admin.tabs.site') },
    { key: 'theme', label: t('admin.tabs.theme') },
    { key: 'settings', label: t('admin.tabs.settings') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-2">{t('admin.title')}</h1>
      <p className="text-muted text-sm mb-10">{t('admin.subtitle')}</p>

      <div className="flex gap-5 border-b border-border mb-8 overflow-x-auto whitespace-nowrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs uppercase tracking-widest pb-3 border-b-2 transition-colors flex-shrink-0 ${
              tab === t.key ? 'border-dark text-dark' : 'border-transparent text-muted hover:text-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && <AdminOrders />}
      {tab === 'products' && <AdminProducts />}
      {tab === 'stats' && <AdminStats />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'admins' && <AdminAdmins />}
      {tab === 'site' && <AdminSite />}
      {tab === 'theme' && (
        <>
          <AdminTheme />
          <AdminCollections />
        </>
      )}
      {tab === 'settings' && <AdminSettings />}
    </div>
  );
}
