import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import type { Country } from '../types';

const COUNTRIES: { value: Country; label: string }[] = [
  { value: 'CANADA', label: 'Canada' },
  { value: 'UNITED_STATES', label: 'United States' },
  { value: 'MEXICO', label: 'Mexico' },
];

export default function Checkout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, total } = useCart();
  const { isAuthenticated } = useAuth();
  const { currency, format } = useCurrency();

  const [address, setAddress] = useState('');
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [useSaved, setUseSaved] = useState(false);
  const [country, setCountry] = useState<Country>('CANADA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else if (items.length === 0) navigate('/cart');
  }, [isAuthenticated, items.length, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.account.getProfile()
      .then(profile => {
        if (profile.address) {
          setSavedAddress(profile.address);
          setUseSaved(true);
          setAddress(profile.address);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  function handleUseSavedToggle(use: boolean) {
    setUseSaved(use);
    if (use && savedAddress) setAddress(savedAddress);
    else setAddress('');
  }

  if (!isAuthenticated || items.length === 0) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { order, clientSecret } = await api.orders.create({
        items: items.map(i => ({ itemId: i.id, quantity: i.quantity })),
        address,
        country,
        currency,
      });
      navigate('/payment', { state: { clientSecret, total: order.total } });
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

            {savedAddress && (
              <div className="flex gap-4 mb-3">
                <button
                  type="button"
                  onClick={() => handleUseSavedToggle(true)}
                  className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors cursor-pointer ${useSaved ? 'bg-dark text-white border-dark' : 'border-border hover:border-dark'}`}
                >
                  {t('checkout.useSavedAddress')}
                </button>
                <button
                  type="button"
                  onClick={() => handleUseSavedToggle(false)}
                  className={`text-xs uppercase tracking-widest px-4 py-2 border transition-colors cursor-pointer ${!useSaved ? 'bg-dark text-white border-dark' : 'border-border hover:border-dark'}`}
                >
                  {t('checkout.enterNewAddress')}
                </button>
              </div>
            )}

            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              readOnly={useSaved && !!savedAddress}
              className={`${inputClass} ${useSaved && savedAddress ? 'opacity-60 cursor-default' : ''}`}
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
          {currency !== 'MXN' && (
            <p className="text-xs text-muted border border-border px-4 py-3 leading-relaxed">
              {t('checkout.currencyNotice')}
            </p>
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
            <div className="space-y-3 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted">{item.name} × {item.quantity}</span>
                  <span>{format(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 flex justify-between text-sm font-medium">
              <span>{t('cart.total')}</span>
              <span>{format(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
