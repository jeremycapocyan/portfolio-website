import { ACTIVE, HttpError, statement, type Env, type Reservation } from './types';
import { type VerifiedPayment } from './payment-provider';
import { confirmationText } from './email';

/** Internal only: called after the installed provider's signature verification. */
export async function confirmVerifiedPayment(env: Env, payment: VerifiedPayment, now = Date.now()) {
  if (payment.status !== 'paid' || payment.currency !== 'PHP' || !payment.paymentId || !payment.provider || !Number.isSafeInteger(payment.amount) || payment.amount <= 0) throw new HttpError(422, 'Invalid verified payment.');
  const r = await statement(env, 'SELECT r.*, s.start_at, s.end_at FROM reservations r JOIN slots s ON s.id=r.slot_id WHERE r.id=?',payment.reservationId).first<Reservation>();
  if (!r) throw new HttpError(404, 'Reservation not found.');
  const id = `${payment.provider}:${payment.paymentId}`;
  if (r.status === 'confirmed' && r.payment_id === id) return { confirmed: true, duplicate: true };
  if (r.status !== 'awaiting_payment' || r.expires_at <= now || r.start_at <= now || r.quote_id !== payment.quoteId || r.quoted_total !== payment.amount) throw new HttpError(409, 'Payment needs manual review: the reservation, quote, amount, or hold has changed. Do not confirm or refund automatically.');
  const result = await env.DB.batch([
    statement(env, 'INSERT INTO payments (id,provider,provider_payment_id,reservation_id,quote_id,amount,currency,received_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',id,payment.provider,payment.paymentId,r.id,payment.quoteId,payment.amount,payment.currency,now),
    statement(env, `UPDATE reservations SET status='confirmed',payment_id=?,confirmed_at=? WHERE id=? AND status='awaiting_payment' AND expires_at>? AND quoted_total=? AND quote_id=? AND EXISTS (SELECT 1 FROM payments p WHERE p.id=? AND p.reservation_id=reservations.id AND p.amount=reservations.quoted_total AND p.quote_id=reservations.quote_id) AND EXISTS (SELECT 1 FROM slots s WHERE s.id=reservations.slot_id AND s.state='open' AND s.start_at>?)`,id,now,r.id,now,payment.amount,payment.quoteId,id,now),
    statement(env, "INSERT INTO email_outbox (id,reservation_id,recipient,subject,body,state,attempts) SELECT ?,id,email,?,?,'pending',0 FROM reservations WHERE id=? AND status='confirmed' AND payment_id=? ON CONFLICT DO NOTHING",`${r.id}:confirmation`,'Your coaching session is confirmed',confirmationText(r),r.id,id),
  ]);
  if (!result[1].meta.changes) {
    const current = await statement(env, 'SELECT status,payment_id FROM reservations WHERE id=?',r.id).first<{status:string;payment_id:string}>();
    if (current?.status !== 'confirmed' || current.payment_id !== id) throw new HttpError(409,'Payment needs manual review.');
  }
  return { confirmed: true, duplicate: false };
}
