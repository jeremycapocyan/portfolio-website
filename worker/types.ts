export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; meta: { changes: number } }>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<{ meta: { changes: number } }[]> }
export interface Env {
  DB: Database; ASSETS?: { fetch(request: Request): Promise<Response> };
  ADMIN_EMAIL?: string; ALERT_EMAIL?: string; SITE_URL?: string;
  RESEND_API_KEY?: string; EMAIL_FROM?: string;
}
export interface Slot { id: string; start_at: number; end_at: number; state: string }
export interface Reservation {
  id: string; slot_id: string; token_hash: string; name: string; email: string; phone: string;
  location: string; players: number; estimated_total: number; quoted_total: number | null;
  quote_id: string | null; status: string; expires_at: number; created_at: number;
  payment_id: string | null; confirmed_at: number | null; start_at: number; end_at: number;
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const ACTIVE = "('pending_review','awaiting_payment','confirmed')";
export const HOUR = 3600000;
export const HOLD = 24 * HOUR;
export function statement(env: Env, sql: string, ...values: unknown[]) { return env.DB.prepare(sql).bind(...values); }
export function expiresStatement(env: Env, now = Date.now()) {
  return statement(env, "UPDATE reservations SET status = 'expired' WHERE status IN ('pending_review','awaiting_payment') AND expires_at <= ?", now);
}
export function estimatedTotal(players: number, durationMs: number) { return Math.round((players === 1 ? 600 : players <= 3 ? 500 : 400) * players * durationMs / HOUR * 100); }
export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, '0')).join('');
}
export function sessionTime(start: number) { return new Intl.DateTimeFormat('en-PH', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(start); }
