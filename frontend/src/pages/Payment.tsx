import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, ExpressCheckoutElement, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../types';

// The publishable key must match whichever Stripe mode (test/live) the backend is
// in, so we fetch it at runtime rather than baking it in at build time. loadStripe
// is cached per key so a given key is only initialised once.
const stripePromiseCache = new Map<string, Promise<Stripe | null>>();
function getStripe(publishableKey: string): Promise<Stripe | null> {
  let promise = stripePromiseCache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripePromiseCache.set(publishableKey, promise);
  }
  return promise;
}

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { clear } = useCart();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<'oxxo' | 'bank_transfer' | null>(null);
  const [hasWallets, setHasWallets] = useState(false);

  async function completePayment() {
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
      const status = result.paymentIntent?.status;
      const nextActionType = result.paymentIntent?.next_action?.type;
      clear();
      if (status === 'requires_action' || status === 'processing') {
        setPendingType(nextActionType === 'oxxo_display_details' ? 'oxxo' : 'bank_transfer');
        setLoading(false);
      } else {
        navigate('/orders', { state: { justPaid: true } });
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await completePayment();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ExpressCheckoutElement
        onConfirm={completePayment}
        onReady={({ availablePaymentMethods }) => {
          setHasWallets(!!availablePaymentMethods && Object.values(availablePaymentMethods).some(Boolean));
        }}
      />
      {hasWallets && (
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted uppercase tracking-widest">{t('payment.or')}</span>
          <div className="flex-1 border-t border-border" />
        </div>
      )}
      <PaymentElement />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {pendingType ? (
        <div className="border border-border p-5 space-y-3">
          <p className="text-sm font-medium">
            {pendingType === 'oxxo' ? t('payment.oxxo.pending') : t('payment.bankTransfer.pending')}
          </p>
          <p className="text-xs text-muted">
            {pendingType === 'oxxo' ? t('payment.oxxo.instructions') : t('payment.bankTransfer.instructions')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="text-xs uppercase tracking-widest border border-dark px-5 py-2.5 hover:bg-dark hover:text-white transition-colors cursor-pointer"
          >
            {t('payment.bankTransfer.viewOrders')}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={loading || !stripe}
          className="w-full bg-dark text-white text-xs uppercase tracking-widest py-4 hover:bg-gold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? t('payment.processing') : t('payment.pay')}
        </button>
      )}
    </form>
  );
}

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const state = location.state as { clientSecret?: string; total?: number; installments?: number | null } | null;
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate('/login');
    else if (!state?.clientSecret) navigate('/orders');
  }, [isLoading, isAuthenticated, state, navigate]);

  useEffect(() => {
    let cancelled = false;
    api.stripe.config()
      .then(cfg => { if (!cancelled && cfg.publishableKey) setStripePromise(getStripe(cfg.publishableKey)); })
      .catch(() => {
        // Fall back to the build-time key so checkout still works if the endpoint fails.
        const fallback = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!cancelled && fallback) setStripePromise(getStripe(fallback));
      });
    return () => { cancelled = true; };
  }, []);

  if (!state?.clientSecret) return null;

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-2">{t('payment.title')}</h1>
      {state.total != null && (
        <p className="text-muted text-sm mb-2">
          {t('payment.orderTotal')}: <span className="text-dark font-medium">${formatMoney(state.total)} MXN</span>
        </p>
      )}
      {state.installments && (
        <p className="text-muted text-sm mb-10">
          {t('payment.msiPlan', { n: state.installments, monthly: formatMoney(Number(state.total) / state.installments) })}
        </p>
      )}
      {!state.installments && <div className="mb-10" />}
      {stripePromise ? (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret: state.clientSecret, appearance: { theme: 'stripe' }, locale: i18n.language as 'en' | 'es' | 'fr' }}
        >
          <PaymentForm />
        </Elements>
      ) : (
        <div className="h-40 bg-[#F0EDE8] animate-pulse" />
      )}
    </div>
  );
}
