import { createContext, useContext, useEffect, useState } from 'react';
import type { Currency } from '../types';
import { formatMoney } from '../types';

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (mxnAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const CURRENCIES: Currency[] = ['MXN', 'USD', 'CAD'];

function detectCurrency(): Currency {
  const saved = localStorage.getItem('currency') as Currency | null;
  if (saved && CURRENCIES.includes(saved)) return saved;
  // Mexico-only store: MXN for everyone regardless of browser locale.
  return 'MXN';
}

function loadCachedRates(): Record<string, number> {
  try {
    const saved = localStorage.getItem('fx_rates');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  // Rough fallback so prices are at least the right magnitude before first fetch
  return { MXN: 1, USD: 0.05, CAD: 0.07 };
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(detectCurrency);
  const [rates, setRates] = useState<Record<string, number>>(loadCachedRates);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL ?? '';
    fetch(`${base}/public/fx-rates`)
      .then(r => r.json())
      .then((data: Record<string, number>) => {
        const updated = { MXN: 1, ...data };
        setRates(updated);
        localStorage.setItem('fx_rates', JSON.stringify(updated));
      })
      .catch(() => { /* keep cached/fallback rates */ });
  }, []);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem('currency', c);
  }

  function format(mxnAmount: number): string {
    const converted = mxnAmount * (rates[currency] ?? 1);
    return `$${formatMoney(converted)} ${currency}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

export { CURRENCIES };
