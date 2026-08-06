'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { formatMt } from '@/lib/pricing-catalog';
import { mtToUsd } from '@/lib/currency';

export type Currency = 'MZN' | 'USD';

const STORAGE_KEY = 'vd_currency';

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  /** Formata um valor guardado em MT (fonte de verdade) na moeda escolhida — só para exibição, nunca para gravar. */
  formatPrice: (amountMt: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('MZN');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved === 'USD' || saved === 'MZN') setCurrencyState(saved);
  }, []);

  const setCurrency = (next: Currency) => {
    setCurrencyState(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next);
  };

  const formatPrice = (amountMt: number) =>
    currency === 'USD' ? `$${mtToUsd(amountMt).toFixed(2)}` : `${formatMt(amountMt)} MT`;

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency deve ser usado dentro de <CurrencyProvider>');
  return ctx;
}
