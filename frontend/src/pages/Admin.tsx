import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { ItemView, ItemViewVerbose, ItemRequest, OrderView, Category, VerboseClient, LabelView, AnnouncementView, SiteAssetView } from '../types';
import { pickLocale, isItemIncomplete, isLabelIncomplete } from '../types';

const CATEGORIES: Category[] = ['NECKLACE', 'RING', 'EARRING', 'MISC'];

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
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [changingStatus, setChangingStatus] = useState<number | null>(null);

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
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F5F0] transition-colors"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              >
                <div className="flex items-center gap-8 min-w-0">
                  <span className="text-xs text-muted w-10 flex-shrink-0">#{o.id}</span>
                  <span className="text-sm flex-shrink-0">{o.firstName} {o.lastName}</span>
                  <span className="text-sm text-muted hidden md:block truncate max-w-[180px]" title={o.email}>{o.email}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`text-xs uppercase tracking-wider ${STATUS_COLOR[o.status]}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm">${o.total.toFixed(2)}</span>
                  <span className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString()}</span>
                </div>
              </button>

              {expanded === o.id && (
                <div className="px-5 pb-5 border-t border-border">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.address')}</p>
                      <p>{o.address}</p>
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
                    <div className="space-y-1">
                      {o.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{t('admin.detail.itemLine', { id: item.itemId, qty: item.quantity })}</span>
                          <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
  category: Category;
  labelIds: number[];
}

const emptyForm: ItemFormData = {
  nameEn: '', nameFr: '', nameEs: '',
  descriptionEn: '', descriptionFr: '', descriptionEs: '',
  price: '', stock: '', category: 'NECKLACE', labelIds: [],
};

interface ItemModalProps {
  item?: ItemView;
  allLabels: LabelView[];
  onClose: () => void;
  onSaved: () => void;
}

function ItemModal({ item, allLabels, onClose, onSaved }: ItemModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ItemFormData>(
    item
      ? {
          nameEn: item.nameEn ?? '', nameFr: item.nameFr ?? '', nameEs: item.nameEs ?? '',
          descriptionEn: item.descriptionEn ?? '', descriptionFr: item.descriptionFr ?? '', descriptionEs: item.descriptionEs ?? '',
          price: String(item.price), stock: String(item.stock),
          category: item.category as Category, labelIds: item.labels.map(l => l.id),
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputClass = 'w-full border border-border bg-cream px-4 py-3 text-sm outline-none focus:border-dark transition-colors';

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
        category: form.category,
        labelIds: form.labelIds,
      };
      if (imageFile) {
        if (item) {
          await api.admin.items.updateWithImage(item.id, payload, imageFile);
        } else {
          await api.admin.items.createWithImage(payload, imageFile);
        }
      } else {
        if (item) {
          await api.admin.items.update(item.id, payload);
        } else {
          await api.admin.items.create(payload);
        }
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
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.category')}</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))} className={inputClass}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                    {label.nameEn || label.nameFr || label.nameEs}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.image')}</label>
            {item?.imageUrl && !imageFile && (
              <img src={item.imageUrl} alt={item.nameEn ?? ''} className="w-20 h-20 object-cover mb-2" />
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} className="text-sm text-muted" />
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

type ProductSort = 'default' | 'sold' | 'sales';

function AdminProducts() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ItemViewVerbose[]>([]);
  const [labels, setLabels] = useState<LabelView[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<ProductSort>('default');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'new' | ItemViewVerbose | null>(null);
  const [newLabel, setNewLabel] = useState({ nameEn: '', nameFr: '', nameEs: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [itemData, labelData] = await Promise.all([
        api.admin.items.listVerbose(),
        api.labels.list(),
      ]);
      setItems(itemData);
      setLabels(labelData);
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

  async function handleDelete(id: number) {
    if (!confirm(t('admin.products.deleteConfirm'))) return;
    await api.admin.items.delete(id);
    load();
  }

  async function handleDeleteImage(id: number) {
    await api.admin.items.deleteImage(id);
    load();
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {sortBtn(t('admin.products.sortBySold'), 'sold')}
            {sortBtn(t('admin.products.sortBySales'), 'sales')}
          </div>
          <button
            onClick={() => setModal('new')}
            className="bg-dark text-white text-xs uppercase tracking-widest px-6 py-3 hover:bg-gold transition-colors"
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
            <div key={item.id} className={`border flex items-center gap-4 px-5 py-4 ${
              !item.active ? 'border-border opacity-60' : incomplete ? 'border-amber-400' : 'border-border'
            }`}>
              {item.imageUrl
                ? <img src={item.imageUrl} alt={displayName} className="w-12 h-12 object-cover flex-shrink-0" />
                : <div className="w-12 h-12 bg-[#F0EDE8] flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{displayName}</p>
                  {!item.active && <span className="text-[10px] uppercase tracking-widest border border-muted text-muted px-1.5 py-0.5">{t('admin.products.inactive')}</span>}
                  {incomplete && <span className="text-[10px] uppercase tracking-widest border border-amber-400 text-amber-600 px-1.5 py-0.5">{t('admin.products.incomplete')}</span>}
                </div>
                <p className="text-xs text-muted">{item.category} · ${item.price.toFixed(2)} · {item.stock} {t('admin.products.inStock')}</p>
                <p className="text-xs text-muted">{item.nbSold} {t('admin.products.sold')} · ${Number(item.totalSales).toFixed(2)} {t('admin.products.total')}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
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
                {item.imageUrl && (
                  <button onClick={() => handleDeleteImage(item.id)} className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors">
                    {t('admin.products.delImage')}
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
                {label.nameEn || label.nameFr || label.nameEs}
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

      {modal !== null && (
        <ItemModal
          item={modal === 'new' ? undefined : modal}
          allLabels={labels}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
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
        <div className="flex items-center gap-8 min-w-0">
          <span className="text-xs text-muted w-10 flex-shrink-0">#{u.id}</span>
          <span className="text-sm flex-shrink-0">{u.firstName} {u.lastName}</span>
          <span className="text-sm text-muted hidden md:block truncate max-w-[180px]" title={u.email}>{u.email}</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted">
          <span>${Number(u.moneySpent).toFixed(2)}</span>
          <span>{u.nbSuccessfulOrders} {t('admin.users.ordersCount')}</span>
          <span className="text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-1">{t('admin.detail.address')}</p>
              <p>{u.address}</p>
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

const SLOT_LABELS: Record<string, string> = {
  hero: 'Hero',
  ring: 'Rings Category',
  necklace: 'Necklaces Category',
  earring: 'Earrings Category',
  bracelet: 'Bracelets Category',
  anklet: 'Anklets Category',
  editorial1: 'Editorial 1',
  editorial2: 'Editorial 2',
};

function AdminSiteAssets() {
  const [assets, setAssets] = useState<SiteAssetView[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { loadAssets(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAssets() {
    setLoading(true);
    try { setAssets(await api.siteAssets.list()); }
    finally { setLoading(false); }
  }

  async function handleUpload(slot: string, file: File) {
    setUploading(slot);
    try {
      const updated = await api.admin.siteAssets.uploadImage(slot, file);
      setAssets(prev => prev.map(a => a.slot === slot ? updated : a));
    } finally { setUploading(null); }
  }

  async function handleDelete(slot: string) {
    setUploading(slot);
    try {
      const updated = await api.admin.siteAssets.deleteImage(slot);
      setAssets(prev => prev.map(a => a.slot === slot ? updated : a));
    } finally { setUploading(null); }
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#F0EDE8] animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-3 mb-10">
      {assets.map(asset => (
        <div key={asset.slot} className="border border-border p-4 flex items-center gap-4">
          <div className="w-20 h-14 bg-[#F0EDE8] shrink-0 overflow-hidden flex items-center justify-center">
            {asset.imageUrl
              ? asset.resourceType === 'video'
                ? <video src={asset.imageUrl} className="w-full h-full object-cover" muted />
                : <img src={asset.imageUrl} alt={asset.slot} className="w-full h-full object-cover" />
              : <span className="text-muted text-xs">—</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{SLOT_LABELS[asset.slot] ?? asset.slot}</p>
            <p className="text-xs text-muted truncate">{asset.imageUrl ?? 'No image'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className={`text-xs uppercase tracking-widest border border-dark bg-dark text-white px-3 py-1.5 cursor-pointer hover:bg-gold transition-colors ${uploading === asset.slot ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading === asset.slot ? '...' : 'Upload'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(asset.slot, f); e.target.value = ''; }}
              />
            </label>
            {asset.imageId && (
              <button
                onClick={() => handleDelete(asset.slot)}
                disabled={uploading === asset.slot}
                className="text-xs uppercase tracking-widest border border-red-300 text-red-500 px-3 py-1.5 hover:border-red-500 transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Site ──────────────────────────────────────────────────────────────────────

function AdminSite() {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<AnnouncementView[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ textEn: '', textFr: '', textEs: '', active: true });
  const [newForm, setNewForm] = useState({ textEn: '', textFr: '', textEs: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try { setAnnouncements(await api.admin.announcements.list()); }
    finally { setLoading(false); }
  }

  function openEdit(a: AnnouncementView) {
    setEditing(a.id);
    setEditForm({ textEn: a.textEn ?? '', textFr: a.textFr ?? '', textEs: a.textEs ?? '', active: a.active });
  }

  async function saveEdit(id: number) {
    setSaving(true);
    try {
      await api.admin.announcements.update(id, { ...editForm });
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
    await api.admin.announcements.create({ ...newForm, active: true });
    setNewForm({ textEn: '', textFr: '', textEs: '' });
    await load();
  }

  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-muted mb-6">Landing Page Assets</h2>
      <AdminSiteAssets />

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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{a.textEn || <span className="text-muted italic">—</span>}</p>
                    {(a.textFr || a.textEs) && (
                      <p className="text-xs text-muted mt-1">{a.textFr}{a.textFr && a.textEs ? ' · ' : ''}{a.textEs}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
        <button type="submit" className="text-xs uppercase tracking-widest border border-dark bg-dark text-white px-4 py-2 hover:bg-gold transition-colors">{t('admin.site.add')}</button>
      </form>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'orders' | 'products' | 'users' | 'admins' | 'site';

export default function Admin() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('orders');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'orders', label: t('admin.tabs.orders') },
    { key: 'products', label: t('admin.tabs.products') },
    { key: 'users', label: t('admin.tabs.users') },
    { key: 'admins', label: t('admin.tabs.admins') },
    { key: 'site', label: t('admin.tabs.site') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-2">{t('admin.title')}</h1>
      <p className="text-muted text-sm mb-10">{t('admin.subtitle')}</p>

      <div className="flex gap-8 border-b border-border mb-8">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs uppercase tracking-widest pb-3 border-b-2 transition-colors ${
              tab === t.key ? 'border-dark text-dark' : 'border-transparent text-muted hover:text-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && <AdminOrders />}
      {tab === 'products' && <AdminProducts />}
      {tab === 'users' && <AdminUsers />}
      {tab === 'admins' && <AdminAdmins />}
      {tab === 'site' && <AdminSite />}
    </div>
  );
}
