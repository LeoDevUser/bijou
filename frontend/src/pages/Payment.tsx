import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '');

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { clear } = useCart();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/orders' },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message ?? t('payment.error'));
      setLoading(false);
    } else {
      clear();
      navigate('/orders', { state: { justPaid: true } });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-dark text-white text-xs uppercase tracking-widest py-4 hover:bg-gold transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? t('payment.processing') : t('payment.pay')}
      </button>
    </form>
  );
}

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const state = location.state as { clientSecret?: string; total?: number; installments?: number | null } | null;

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else if (!state?.clientSecret) navigate('/orders');
  }, [isAuthenticated, state, navigate]);

  if (!state?.clientSecret) return null;

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-2">{t('payment.title')}</h1>
      {state.total != null && (
        <p className="text-muted text-sm mb-2">
          {t('payment.orderTotal')}: <span className="text-dark font-medium">${Number(state.total).toFixed(2)} MXN</span>
        </p>
      )}
      {state.installments && (
        <p className="text-muted text-sm mb-10">
          {t('payment.msiPlan', { n: state.installments, monthly: (Number(state.total) / state.installments).toFixed(2) })}
        </p>
      )}
      {!state.installments && <div className="mb-10" />}
      <Elements
        stripe={stripePromise}
        options={{ clientSecret: state.clientSecret, appearance: { theme: 'stripe' }, locale: i18n.language as 'en' | 'es' | 'fr' }}
      >
        <PaymentForm />
      </Elements>
    </div>
  );
}
