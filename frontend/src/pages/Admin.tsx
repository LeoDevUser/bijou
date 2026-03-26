import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { ItemView, ItemRequest, OrderView, Category } from '../types';

const CATEGORIES: Category[] = ['NECKLACE', 'RING', 'EARRING', 'MISC'];

const STATUS_COLOR: Record<string, string> = {
  AWAITING_PAYMENT: 'text-amber-600',
  PROCESSING: 'text-blue-600',
  SHIPPED: 'text-indigo-600',
  DELIVERED: 'text-green-600',
  CANCELLED: 'text-muted',
};

// ── Orders ────────────────────────────────────────────────────────────────────

function AdminOrders() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

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

  const selectClass = 'border border-border bg-cream px-3 py-2 text-sm outline-none focus:border-dark transition-colors';

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCountryFilter(''); }}
          className={selectClass}
        >
          <option value="">All Statuses</option>
          {['AWAITING_PAYMENT', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={countryFilter}
          onChange={e => { setCountryFilter(e.target.value); setStatusFilter(''); }}
          className={selectClass}
        >
          <option value="">All Countries</option>
          {['CANADA', 'UNITED_STATES', 'MEXICO'].map(c => (
            <option key={c} value={c}>{c.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#F0EDE8] animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-muted text-center py-16">No orders found.</p>
      ) : (
        <div className="space-y-2">
          {orders.map(o => (
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
                      <p className="text-xs uppercase tracking-widest text-muted mb-1">Address</p>
                      <p>{o.address}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted mb-1">Country</p>
                      <p>{o.country.replace('_', ' ')}</p>
                    </div>
                    {o.tracking && (
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted mb-1">Tracking</p>
                        <p>{o.tracking}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-widest text-muted mb-2">Items</p>
                    <div className="space-y-1">
                      {o.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>Item #{item.itemId} × {item.quantity}</span>
                          <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
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
      const saved = item
        ? await api.admin.items.update(item.id, payload)
        : await api.admin.items.create(payload);
      if (imageFile) await api.admin.items.uploadImage(saved.id, imageFile);
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-cream w-full max-w-lg max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
        <h2 className="font-serif text-2xl font-light mb-6">{item ? 'Edit Product' : 'New Product'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">Price</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">Stock</label>
              <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))} className={inputClass}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">
              Labels <span className="normal-case text-muted">(comma separated)</span>
            </label>
            <input value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} placeholder="gold, sterling silver" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">Image</label>
            {item?.imageUrl && !imageFile && (
              <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover mb-2" />
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} className="text-sm text-muted" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-dark text-white text-xs uppercase tracking-widest py-3 hover:bg-gold transition-colors disabled:opacity-50">
              {saving ? '...' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-border text-xs uppercase tracking-widest py-3 hover:border-dark transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Products ──────────────────────────────────────────────────────────────────

function AdminProducts() {
  const [items, setItems] = useState<ItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'new' | ItemView | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setItems(await api.items.list()); } finally { setLoading(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await api.admin.items.delete(id);
    load();
  }

  async function handleDeleteImage(id: number) {
    await api.admin.items.deleteImage(id);
    load();
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setModal('new')}
          className="bg-dark text-white text-xs uppercase tracking-widest px-6 py-3 hover:bg-gold transition-colors"
        >
          + Add Product
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#F0EDE8] animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted text-center py-16">No products yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="border border-border flex items-center gap-4 px-5 py-4">
              {item.imageUrl
                ? <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover flex-shrink-0" />
                : <div className="w-12 h-12 bg-[#F0EDE8] flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted">{item.category} · ${item.price.toFixed(2)} · {item.stock} in stock</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <button onClick={() => setModal(item)} className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors">
                  Edit
                </button>
                <button onClick={() => api.admin.items.activate(item.id).then(load)} className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors">
                  Activate
                </button>
                <button onClick={() => api.admin.items.deactivate(item.id).then(load)} className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors">
                  Deactivate
                </button>
                {item.imageUrl && (
                  <button onClick={() => handleDeleteImage(item.id)} className="text-xs uppercase tracking-widest border border-border px-3 py-1.5 hover:border-dark transition-colors">
                    Del Image
                  </button>
                )}
                <button onClick={() => handleDelete(item.id)} className="text-xs uppercase tracking-widest border border-red-300 text-red-500 px-3 py-1.5 hover:border-red-500 transition-colors">
                  Delete
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

function AdminUsers() {
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await api.admin.users.promote(parseInt(id));
      setMsg({ type: 'success', text: `User #${id} promoted to admin.` });
      setId('');
    } catch {
      setMsg({ type: 'error', text: 'Failed to promote user. Check the ID.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm">
      <p className="text-sm text-muted mb-6">Promote a user to admin by their account ID.</p>
      <form onSubmit={handlePromote} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-widest mb-2">User ID</label>
          <input
            type="number"
            min="1"
            value={id}
            onChange={e => setId(e.target.value)}
            required
            className="w-full border border-border bg-cream px-4 py-3 text-sm outline-none focus:border-dark transition-colors"
          />
        </div>
        {msg && (
          <p className={msg.type === 'success' ? 'text-green-600 text-sm' : 'text-red-500 text-sm'}>{msg.text}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-dark text-white text-xs uppercase tracking-widest py-3 hover:bg-gold transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Promote to Admin'}
        </button>
      </form>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'orders' | 'products' | 'users';
const TABS: { key: Tab; label: string }[] = [
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
  { key: 'users', label: 'Users' },
];

export default function Admin() {
  const [tab, setTab] = useState<Tab>('orders');

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-2">Admin</h1>
      <p className="text-muted text-sm mb-10">Bijou Monde management console</p>

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
    </div>
  );
}
