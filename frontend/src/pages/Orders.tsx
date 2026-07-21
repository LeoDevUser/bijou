import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { pickLocale, formatMoney } from '../types';
import type { OrderView } from '../types';
import AutoplayVideo from '../components/ui/AutoplayVideo';
import { optimizedImageUrl } from '../utils/cloudinary';


const STATUS_COLOR: Record<string, string> = {
  AWAITING_PAYMENT: 'text-amber-600',
  PROCESSING: 'text-blue-600',
  SHIPPED: 'text-indigo-600',
  DELIVERED: 'text-green-600',
  CANCELLED: 'text-muted',
};

export default function Orders() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { navigate('/login'); return; }
    api.orders.list()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));

    const justPaid = (location.state as { justPaid?: boolean } | null)?.justPaid;
    if (justPaid) {
      const id = setTimeout(() => {
        api.orders.list().then(setOrders).catch(console.error);
      }, 1000);
      return () => clearTimeout(id);
    }
  }, [isLoading, isAuthenticated, navigate, location.state]);

  async function handlePay(order: OrderView) {
    setPayingId(order.id);
    try {
      const clientSecret = await api.orders.getClientSecret(order.id);
      navigate('/payment', { state: { clientSecret, total: order.total } });
    } catch (err) {
      console.error(err);
    } finally {
      setPayingId(null);
    }
  }

  async function handleCancel(id: number) {
    setCancelling(id);
    try {
      await api.orders.cancel(id);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'CANCELLED' } : o));
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-10">{t('orders.title')}</h1>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#F0EDE8] animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-muted text-center py-24">{t('orders.empty')}</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="border border-border p-4 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted mb-1">
                    {t('orders.order')} #{order.id}
                  </p>
                  <p className="text-sm mb-2">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p className={`text-xs uppercase tracking-wider font-medium ${STATUS_COLOR[order.status] ?? ''}`}>
                    {t(`orders.status.${order.status}`, { defaultValue: order.status })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${formatMoney(order.total)}</p>
                  <p className="text-xs text-muted mt-1">{order.items.length} {t('orders.items')}</p>
                </div>
              </div>

              <p className="text-xs text-muted mt-3">
                {order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ''}{order.colonial ? `, ${order.colonial}` : ''}, {order.city}, {order.state}, {order.postalCode} · {order.country.replace('_', ' ')}
              </p>

              <div className="flex flex-wrap gap-3 mt-4">
                {order.items.map(item => {
                  const name = pickLocale(item.nameEn, item.nameFr, item.nameEs, i18n.language);
                  const content = (
                    <div className="flex items-center gap-2">
                      {item.imageUrl
                        ? item.resourceType === 'video'
                          ? <AutoplayVideo src={item.imageUrl} className="w-10 h-10 object-cover bg-[#F0EDE8] flex-shrink-0" />
                          : <img src={optimizedImageUrl(item.imageUrl)} alt={name} className="w-10 h-10 object-cover bg-[#F0EDE8] flex-shrink-0" />
                        : <div className="w-10 h-10 bg-[#F0EDE8] flex-shrink-0" />
                      }
                      <div>
                        <p className="text-xs">{name}{item.sizeLabel ? ` · ${item.sizeLabel}` : ''}</p>
                        <p className="text-xs text-muted">×{item.quantity}</p>
                      </div>
                    </div>
                  );
                  const key = `${item.itemId}:${item.sizeLabel ?? ''}`;
                  return item.active
                    ? <Link key={key} to={`/shop/${item.itemId}`} className="hover:opacity-75 transition-opacity">{content}</Link>
                    : <div key={key}>{content}</div>;
                })}
              </div>

              {order.tracking && (
                <p className="text-xs text-muted mt-4">
                  {t('orders.tracking')}: {order.tracking}
                </p>
              )}

              {order.status === 'AWAITING_PAYMENT' && (
                <div className="mt-5">
                  {order.oxxo ? (
                    <div className="mb-3">
                      <p className="text-xs uppercase tracking-widest text-amber-600 font-medium mb-1">{t('orders.oxxo.label')}</p>
                      <p className="text-xs text-muted">{t('orders.oxxo.instructions')}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePay(order)}
                      disabled={payingId === order.id}
                      className="text-xs uppercase tracking-wider bg-dark text-white px-5 py-2 hover:bg-gold transition-colors disabled:opacity-50 cursor-pointer mr-3"
                    >
                      {payingId === order.id ? '...' : t('orders.pay')}
                    </button>
                  )}
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancelling === order.id}
                    className="text-xs uppercase tracking-wider border border-border px-5 py-2 hover:border-dark transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {cancelling === order.id ? '...' : t('orders.cancel')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
