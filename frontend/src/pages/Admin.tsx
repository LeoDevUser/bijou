import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { ItemView, ItemViewVerbose, ItemRequest, OrderView, VerboseClient, LabelView, CategoryView, AnnouncementView, CollectionView, CollectionSiteAssetView, CollectionThemeView, SalesStats, ThemeConfig, AppSettings, BrevoQuota, CloudinaryResource, CloudinaryResourcesPage } from '../types';
import { pickLocale, isItemIncomplete, isLabelIncomplete } from '../types';
import { useTheme, THEME_DEFAULTS, mergeCollectionTheme } from '../context/ThemeContext';

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
                <span className="text-sm flex-shrink-0">${o.total.toFixed(2)}</span>
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
                        const name = pickLocale(item.nameEn, item.nameFr, item.nameEs, i18n.language) ?? item.nameEn ?? `#${item.itemId}`;
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
                                <p className="text-sm truncate">{name}</p>
                                <p className="text-xs text-muted">×{item.quantity}</p>
                              </div>
                            </div>
                            <span className="text-sm flex-shrink-0">${(item.unitPrice * item.quantity).toFixed(2)}</span>
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
  categoryId: number;
  labelIds: number[];
  material: string;
  usmcaQualified: boolean;
}

const emptyForm: ItemFormData = {
  nameEn: '', nameFr: '', nameEs: '',
  descriptionEn: '', descriptionFr: '', descriptionEs: '',
  price: '', stock: '', discountPercent: '', categoryId: 0, labelIds: [],
  material: 'SILVER', usmcaQualified: false,
};

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
          categoryId: item.category.id, labelIds: item.labels.map(l => l.id),
          material: item.material ?? '', usmcaQualified: item.usmcaQualified ?? false,
        }
      : { ...emptyForm, categoryId: allCategories[0]?.id ?? 0 }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentAssets, setCurrentAssets] = useState(item?.assets ?? []);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputClass = 'w-full border border-border bg-cream px-4 py-3 text-sm outline-none focus:border-dark transition-colors';

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
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        discountPercent: form.discountPercent ? parseInt(form.discountPercent) : null,
        categoryId: form.categoryId,
        labelIds: form.labelIds,
        material: form.material as JewelryMaterial,
        usmcaQualified: form.usmcaQualified,
      };
      let itemId: number;
      if (item) {
        await api.admin.items.update(item.id, payload);
        itemId = item.id;
      } else {
        const created = await api.admin.items.create(payload);
        itemId = created.id;
      }
      for (const file of pendingFiles) {
        await api.admin.items.addAsset(itemId, file);
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
              <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.stock')}</label>
              <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required className={inputClass} />
            </div>
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
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.category')}</label>
            <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: Number(e.target.value) }))} className={inputClass}>
              {allCategories.map(c => (
                <option key={c.id} value={c.id}>
                  {pickLocale(c.nameEn, c.nameFr, c.nameEs, i18n.language)}
                </option>
              ))}
            </select>
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
            {currentAssets.length > 0 && (
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
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm,video/quicktime"
              onChange={e => setPendingFiles(Array.from(e.target.files ?? []))}
              className="text-sm text-muted"
            />
            {pendingFiles.length > 0 && (
              <p className="text-xs text-muted mt-1">{pendingFiles.length} {t('admin.modal.filesSelected')}</p>
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
            const displayName = item.nameEn || item.nameFr || item.nameEs || `#${item.id}`;
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
                  <p className="text-xs text-muted">{pickLocale(item.category.nameEn, item.category.nameFr, item.category.nameEs, i18n.language)} · {item.discountPercent ? `$${(Number(item.price) * (1 - item.discountPercent / 100)).toFixed(2)} ` : ''}<span className={item.discountPercent ? 'line-through' : ''}>${Number(item.price).toFixed(2)}</span> · {item.stock} {t('admin.products.inStock')}</p>
                  <p className="text-xs text-muted">
                    {item.nbSold} {t('admin.products.sold')} ({item.nbSoldMonth} {t('admin.products.thisMonth')}) · ${Number(item.totalSalesMonth).toFixed(2)} {t('admin.products.thisMonth')}
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
        saved = await api.admin.collections.uploadImage(saved.id, file);
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
            <img src={pickedMedia?.secureUrl ?? initial!.imageUrl!} alt="" className="w-24 h-16 object-cover mb-2" />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={e => { setPickedMedia(null); setFile(e.target.files?.[0] ?? null); }}
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

  const filtered = (page?.resources ?? []).filter(r =>
    !search || r.publicId.toLowerCase().includes(search.toLowerCase()));

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
                <p className="text-xs font-mono truncate">{resource.publicId}</p>
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

function CollectionAssetsPanel({ collectionId, siteAssets, labels, onUpdate }: {
  collectionId: number;
  siteAssets: CollectionSiteAssetView[];
  labels: LabelView[];
  onUpdate: (updated: CollectionSiteAssetView) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [browsingSlot, setBrowsingSlot] = useState<string | null>(null);
  const [textForm, setTextForm] = useState({ headerEn: '', headerFr: '', headerEs: '', subheaderEn: '', subheaderFr: '', subheaderEs: '', taglineEn: '', taglineFr: '', taglineEs: '', color: '', headerColor: '', subheaderColor: '', taglineColor: '', ctaCategory: '', ctaLabelId: '' });

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
      ctaCategory: asset.ctaCategory ?? '',
      ctaLabelId: asset.ctaLabelId != null ? String(asset.ctaLabelId) : '',
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
        ctaCategory: textForm.ctaCategory || null,
        ctaLabelId: textForm.ctaLabelId ? Number(textForm.ctaLabelId) : null,
      });
      onUpdate(updated);
      setEditing(null);
    } finally { setSaving(false); }
  }

  async function handleUpload(slot: string, file: File) {
    setUploading(slot);
    try {
      const updated = await api.admin.collections.uploadAssetImage(collectionId, slot, file);
      onUpdate(updated);
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
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(slot, f); e.target.value = ''; }}
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
                    <select
                      value={textForm.ctaCategory}
                      onChange={e => setTextForm(f => ({ ...f, ctaCategory: e.target.value }))}
                      className={`${selectClass} w-full`}
                    >
                      <option value="">{t('admin.site.noneOption')}</option>
                      {ASSET_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-muted uppercase tracking-widest mb-1">{t('admin.site.ctaLabel')}</p>
                    <select
                      value={textForm.ctaLabelId}
                      onChange={e => setTextForm(f => ({ ...f, ctaLabelId: e.target.value }))}
                      className={`${selectClass} w-full`}
                    >
                      <option value="">{t('admin.site.noneOption')}</option>
                      {labels.map(l => (
                        <option key={l.id} value={l.id}>{l.nameEn || l.nameFr || l.nameEs}</option>
                      ))}
                    </select>
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
                        ? <img src={c.imageUrl} alt={header || labelNames} className="w-16 h-12 object-cover" />
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
          <span className="hidden sm:block">${Number(u.moneySpent).toFixed(2)}</span>
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
              <p>${Number(u.moneySpent).toFixed(2)}</p>
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

const SLOT_LABEL_KEYS: Record<string, string> = {
  hero: 'admin.site.slots.hero',
  ring: 'admin.site.slots.ring',
  necklace: 'admin.site.slots.necklace',
  earring: 'admin.site.slots.earring',
  bracelet: 'admin.site.slots.bracelet',
  editorial1: 'admin.site.slots.editorial1',
  editorial2: 'admin.site.slots.editorial2',
  editorial3: 'admin.site.slots.editorial3',
  editorial4: 'admin.site.slots.editorial4',
};

const ASSET_CATEGORIES: { value: string; labelKey: string }[] = [
  { value: 'RING', labelKey: 'home.categories.rings' },
  { value: 'NECKLACE', labelKey: 'home.categories.necklaces' },
  { value: 'EARRING', labelKey: 'home.categories.earrings' },
  { value: 'MISC', labelKey: 'shop.misc' },
];

// ── Site ──────────────────────────────────────────────────────────────────────

const ANNOUNCEMENT_CATEGORIES = ['NECKLACE', 'RING', 'EARRING', 'MISC'] as const;

type AnnouncementForm = {
  textEn: string; textFr: string; textEs: string; active: boolean;
  ctaType: 'none' | 'category' | 'label' | 'collection';
  ctaCategory: string; ctaLabelId: number | null; ctaCollectionId: number | null;
};

function emptyAnnouncementForm(): AnnouncementForm {
  return { textEn: '', textFr: '', textEs: '', active: true, ctaType: 'none', ctaCategory: '', ctaLabelId: null, ctaCollectionId: null };
}

function formFromAnnouncement(a: AnnouncementView): AnnouncementForm {
  let ctaType: AnnouncementForm['ctaType'] = 'none';
  if (a.ctaCollectionId != null) ctaType = 'collection';
  else if (a.ctaLabelId != null) ctaType = 'label';
  else if (a.ctaCategory) ctaType = 'category';
  return {
    textEn: a.textEn ?? '', textFr: a.textFr ?? '', textEs: a.textEs ?? '', active: a.active,
    ctaType, ctaCategory: a.ctaCategory ?? '', ctaLabelId: a.ctaLabelId, ctaCollectionId: a.ctaCollectionId,
  };
}

function formToRequest(f: AnnouncementForm) {
  return {
    textEn: f.textEn, textFr: f.textFr, textEs: f.textEs, active: f.active,
    ctaCategory: f.ctaType === 'category' ? f.ctaCategory || null : null,
    ctaLabelId: f.ctaType === 'label' ? f.ctaLabelId : null,
    ctaCollectionId: f.ctaType === 'collection' ? f.ctaCollectionId : null,
  };
}

function AnnouncementCtaFields({ form, setForm, labels, collections }: {
  form: AnnouncementForm;
  setForm: React.Dispatch<React.SetStateAction<AnnouncementForm>>;
  labels: LabelView[];
  collections: CollectionView[];
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="space-y-2">
      <select value={form.ctaType} onChange={e => setForm(f => ({ ...f, ctaType: e.target.value as AnnouncementForm['ctaType'] }))}
        className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full">
        <option value="none">{t('admin.site.ctaNone')}</option>
        <option value="category">{t('admin.site.ctaCategory')}</option>
        <option value="label">{t('admin.site.ctaLabel')}</option>
        <option value="collection">{t('admin.site.ctaCollection')}</option>
      </select>
      {form.ctaType === 'category' && (
        <select value={form.ctaCategory} onChange={e => setForm(f => ({ ...f, ctaCategory: e.target.value }))}
          className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full">
          <option value="">— {t('admin.site.ctaCategory')} —</option>
          {ANNOUNCEMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {form.ctaType === 'label' && (
        <select value={form.ctaLabelId ?? ''} onChange={e => setForm(f => ({ ...f, ctaLabelId: Number(e.target.value) || null }))}
          className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full">
          <option value="">— {t('admin.site.ctaLabel')} —</option>
          {labels.map(l => <option key={l.id} value={l.id}>{pickLocale(l.nameEn, l.nameFr, l.nameEs, i18n.language)}</option>)}
        </select>
      )}
      {form.ctaType === 'collection' && (
        <select value={form.ctaCollectionId ?? ''} onChange={e => setForm(f => ({ ...f, ctaCollectionId: Number(e.target.value) || null }))}
          className="border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors w-full">
          <option value="">— {t('admin.site.ctaCollection')} —</option>
          {collections.map(c => <option key={c.id} value={c.id}>{pickLocale(c.headerEn, c.headerFr, c.headerEs, i18n.language) || pickLocale(c.labelNameEn, c.labelNameFr, c.labelNameEs, i18n.language) || `#${c.id}`}</option>)}
        </select>
      )}
    </div>
  );
}

function AdminSite() {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<AnnouncementView[]>([]);
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
      const [a, l, c] = await Promise.all([api.admin.announcements.list(), api.labels.list(), api.collections.list()]);
      setAnnouncements(a);
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
                  <AnnouncementCtaFields form={editForm} setForm={setEditForm} labels={labels} collections={collections} />
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
        <AnnouncementCtaFields form={newForm} setForm={setNewForm} labels={labels} collections={collections} />
        <button type="submit" className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-4 py-2 hover:bg-gold transition-colors">{t('admin.site.add')}</button>
      </form>
    </div>
  );
}

// ── Sales Stats ───────────────────────────────────────────────────────────────

function AdminStats() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [items, setItems] = useState<ItemViewVerbose[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'month' | 'quarter' | 'year' | 'total'>('month');

  useEffect(() => {
    Promise.all([api.admin.items.salesStats(), api.admin.items.listVerbose()])
      .then(([s, i]) => { setStats(s); setItems(i); })
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
    { label: t('admin.stats.week'),    value: stats.week,    orders: stats.ordersWeek },
    { label: t('admin.stats.month'),   value: stats.month,   orders: stats.ordersMonth },
    { label: t('admin.stats.quarter'), value: stats.quarter, orders: stats.ordersQuarter },
    { label: t('admin.stats.year'),    value: stats.year,    orders: stats.ordersYear },
    { label: t('admin.stats.allTime'), value: stats.total,   orders: stats.ordersTotal },
  ] : [];

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
              <p className="font-serif text-2xl font-light">${Number(card.value).toFixed(2)}</p>
              <p className="text-xs text-muted mt-1">{t('admin.stats.stripeFee', { amount: stripeFee(Number(card.value), card.orders).toFixed(2) })}</p>
              <p className="text-xs font-medium mt-0.5">{t('admin.stats.stripeNet', { amount: (Number(card.value) - stripeFee(Number(card.value), card.orders)).toFixed(2) })}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">{t('admin.stats.stripeNote')}</p>
      </div>

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
            const name = item.nameEn || item.nameFr || item.nameEs || `#${item.id}`;
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
                <span>${Number(item.totalSalesWeek).toFixed(2)}</span>
                <span>${Number(item.totalSalesMonth).toFixed(2)}</span>
                <span>${Number(item.totalSalesYear).toFixed(2)}</span>
                <span>${Number(item.totalSales).toFixed(2)}</span>
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
