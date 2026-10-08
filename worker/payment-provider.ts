import { HttpError, type Env } from './types';

/** This is the only extension point a future payment provider should implement.
 * verifyWebhook MUST verify the raw request signature, timestamp and paid/captured
 * provider status. Map provider metadata to the server-created reservation/quote.
 * Never use browser redirects, query parameters, screenshots, or client JSON as proof.
 */
export interface VerifiedPayment {
  provider: string; paymentId: string; reservationId: string; quoteId: string;
  amount: number; currency: 'PHP'; status: 'paid';
}
export interface PaymentProvider {
  verifyWebhook(request: Request, env: Env): Promise<VerifiedPayment>;
  createCheckout(input: { reservationId: string; quoteId: string; amount: number; currency: 'PHP'; expiresAt: number }, env: Env): Promise<{ url: string }>;
}
export function paymentProvider(_env: Env): PaymentProvider | null {
  // Provider deliberately not selected. Add a verified adapter here when ready.
  // There is no demo/unsigned webhook or manual paid toggle in production.
  return null;
}
export function requirePaymentProvider(env: Env): PaymentProvider {
  const provider = paymentProvider(env);
  if (!provider) throw new HttpError(503, 'Online payments are not connected yet. Your reservation is not a confirmed booking.');
  return provider;
}
