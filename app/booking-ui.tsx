'use client';

export const FACEBOOK = 'https://www.facebook.com/CoachJeremyPickleball';
export const money = (cents: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(cents / 100);
export const dateTime = (value: number) => new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(value);
export const time = (value: number) => new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' }).format(value);
export const dateKey = (value: number) => new Date(value + 8 * 3600000).toISOString().slice(0, 10);
export const statusLabel: Record<string, string> = { pending_review: 'Pending coach review', awaiting_payment: 'Awaiting payment', confirmed: 'Confirmed — payment verified', expired: 'Hold expired', cancelled: 'Cancelled' };
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, cache: 'no-store' });
  let data; try { data = await response.json(); } catch { throw new ApiError('The calendar is unavailable. Please try again or message Coach Jeremy.', response.status); }
  if (!response.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', response.status);
  return data as T;
}
export function BookingHeader({ label }: { label: string }) { return <header className="booking-header"><a className="footer-brand" href="/">COACH JEREMY<span>LEARN / PLAY / IMPROVE</span></a><span>{label}</span><a href="/" className="text-link">Back to website ↗</a></header>; }
