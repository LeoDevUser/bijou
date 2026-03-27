import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { ItemView, ItemViewVerbose, ItemRequest, OrderView, Category, VerboseClient } from '../types';

const CATEGORIES: Category[] = ['NECKLACE', 'RING', 'EARRING', 'MISC'];

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
      <div className="flex flex-wrap gap-3 mb-6">
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
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.search.orderPlaceholder')}
          className={searchClass}
        />
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className={searchClass}
        />
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
                <div className="flex items-center gap-8">
                  <span className="text-xs text-muted w-10">#{o.id}</span>
                  <span className="text-sm">{o.firstName} {o.lastName}</span>
                  <span className="text-sm text-muted hidden md:block">{o.email}</span>
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
                  <div className="mt-4 flex items-center gap-3">
                    <p className="text-xs uppercase tracking-widest text-muted">{t('admin.orders.changeStatus')}</p>
                    <select
                      defaultValue={o.status}
                      onChange={async e => {
                        const next = e.target.value;
                        if (next === o.status) return;
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
                      {['AWAITING_PAYMENT', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    {changingStatus === o.id && <span className="text-xs text-muted">...</span>}
                  </div>
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
  name: string;
  description: string;
  price: string;
  stock: string;
  category: Category;
  labels: string;
}

const emptyForm: ItemFormData = {
  name: '', description: '', price: '', stock: '', category: 'NECKLACE', labels: '',
};

interface ItemModalProps {
  item?: ItemView;
  onClose: () => void;
  onSaved: () => void;
}

function ItemModal({ item, onClose, onSaved }: ItemModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ItemFormData>(
    item
      ? { name: item.name, description: item.description, price: String(item.price), stock: String(item.stock), category: item.category as Category, labels: item.labels.join(', ') }
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
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        category: form.category,
        labels: form.labels.split(',').map(l => l.trim()).filter(Boolean),
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
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.description')}</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inputClass} />
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
            <label className="block text-xs uppercase tracking-widest mb-2">
              {t('admin.modal.labels')} <span className="normal-case text-muted">{t('admin.modal.labelsHint')}</span>
            </label>
            <input value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} placeholder={t('admin.modal.labelsPlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('admin.modal.image')}</label>
            {item?.imageUrl && !imageFile && (
              <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover mb-2" />
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
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<ProductSort>('default');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'new' | ItemViewVerbose | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setItems(await api.admin.items.listVerbose()); } finally { setLoading(false); }
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
      return String(item.id).includes(q) || item.name.toLowerCase().includes(q);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.search.productPlaceholder')}
            className={searchClass}
          />
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

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#F0EDE8] animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-muted text-center py-16">{t('admin.products.empty')}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(item => (
            <div key={item.id} className={`border flex items-center gap-4 px-5 py-4 ${item.active ? 'border-border' : 'border-border opacity-60'}`}>
              {item.imageUrl
                ? <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover flex-shrink-0" />
                : <div className="w-12 h-12 bg-[#F0EDE8] flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.name}</p>
                  {!item.active && <span className="text-[10px] uppercase tracking-widest border border-muted text-muted px-1.5 py-0.5">{t('admin.products.inactive')}</span>}
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
          ))}
        </div>
      )}

      {modal !== null && (
        <ItemModal
          item={modal === 'new' ? undefined : modal}
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
        <div className="flex items-center gap-8">
          <span className="text-xs text-muted w-10">#{u.id}</span>
          <span className="text-sm">{u.firstName} {u.lastName}</span>
          <span className="text-sm text-muted hidden md:block">{u.email}</span>
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
                <p className="text-xs font-mono truncate">{u.stripeCustomerId}</p>
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
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.search.clientPlaceholder')}
          className={searchClass}
        />
        <div className="flex gap-2">
          {sortBtn(t('admin.users.sortByMoney'), 'money')}
          {sortBtn(t('admin.users.sortByOrders'), 'orders')}
        </div>
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
          className={searchClass}
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

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'orders' | 'products' | 'users' | 'admins';

export default function Admin() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('orders');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'orders', label: t('admin.tabs.orders') },
    { key: 'products', label: t('admin.tabs.products') },
    { key: 'users', label: t('admin.tabs.users') },
    { key: 'admins', label: t('admin.tabs.admins') },
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
    </div>
  );
}
