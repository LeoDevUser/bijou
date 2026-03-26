import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { OrderView } from '../types';

const STATUS_COLOR: Record<string, string> = {
  AWAITING_PAYMENT: 'text-amber-600',
  PROCESSING: 'text-blue-600',
  SHIPPED: 'text-indigo-600',
  DELIVERED: 'text-green-600',
  CANCELLED: 'text-muted',
};

export default function Orders() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    api.orders.list()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, navigate]);

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
    <div className="max-w-4xl mx-auto px-6 py-12">
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
            <div key={order.id} className="border border-border p-6">
              <div className="flex items-start justify-between">
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
                  <p className="font-medium">${Number(order.total).toFixed(2)}</p>
                  <p className="text-xs text-muted mt-1">{order.items.length} {t('orders.items')}</p>
                </div>
              </div>

              {order.tracking && (
                <p className="text-xs text-muted mt-4">
                  {t('orders.tracking')}: {order.tracking}
                </p>
              )}

              {order.status === 'AWAITING_PAYMENT' && (
                <button
                  onClick={() => handleCancel(order.id)}
                  disabled={cancelling === order.id}
                  className="mt-5 text-xs uppercase tracking-wider border border-border px-5 py-2 hover:border-dark transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {cancelling === order.id ? '...' : t('orders.cancel')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
