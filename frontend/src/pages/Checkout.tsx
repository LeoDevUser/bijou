import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import type { Country, Currency } from '../types';

const COUNTRIES: { value: Country; label: string }[] = [
  { value: 'CANADA', label: 'Canada' },
  { value: 'UNITED_STATES', label: 'United States' },
  { value: 'MEXICO', label: 'Mexico' },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'MXN', label: 'MXN — Mexican Peso' },
];

export default function Checkout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, total, clear } = useCart();
  const { isAuthenticated } = useAuth();

  const [address, setAddress] = useState('');
  const [country, setCountry] = useState<Country>('CANADA');
  const [currency, setCurrency] = useState<Currency>('CAD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) { navigate('/login'); return null; }
  if (items.length === 0) { navigate('/cart'); return null; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.orders.create({
        items: items.map(i => ({ itemId: i.id, quantity: i.quantity })),
        address,
        country,
        currency,
      });
      clear();
      navigate('/orders');
    } catch (err) {
      const e = err as { code?: string };
      setError(e.code ?? t('checkout.error'));
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full border border-border bg-cream px-4 py-3 text-sm outline-none focus:border-dark transition-colors';
  const labelClass = 'block text-xs uppercase tracking-widest mb-2';

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-10">{t('checkout.title')}</h1>

      <div className="grid md:grid-cols-[1fr_300px] gap-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>{t('checkout.address')}</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('checkout.country')}</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value as Country)}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              {COUNTRIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('checkout.currency')}</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as Currency)}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              {CURRENCIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

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
            <div className="space-y-3 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted">{item.name} × {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 flex justify-between text-sm font-medium">
              <span>{t('cart.total')}</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
