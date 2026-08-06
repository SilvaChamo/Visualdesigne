import Stripe from 'stripe';
import { MZN_TO_USD_RATE } from '@/lib/currency';

let stripeClient: Stripe | null = null;

/** Cliente Stripe server-side (nunca importar este ficheiro em código de cliente). */
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY não está configurada.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * A Stripe não liquida em MZN. Convertemos para USD (2 casas decimais) usando
 * a mesma taxa partilhada do resto do site (ver lib/currency.ts), para nunca
 * divergir do que é mostrado ao cliente no selector de moeda.
 */
export function mznToUsdCents(amountMt: number): number {
  const rate = Number(process.env.MZN_TO_USD_RATE) || MZN_TO_USD_RATE;
  const usd = amountMt / rate;
  return Math.max(50, Math.round(usd * 100)); // Stripe exige mínimo ~USD 0.50
}
