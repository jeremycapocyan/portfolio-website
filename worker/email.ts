import { statement, sessionTime, type Env, type Reservation } from './types';
export function emailReady(env: Env) { return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM); }
export function confirmationText(r: Reservation) {
  return `Hi ${r.name},\n\nYour pickleball coaching session with Coach Jeremy is confirmed. Payment has been verified.\n\nBooking: ${r.id}\nWhen: ${sessionTime(r.start_at)} (Philippine time)\nDuration: ${(r.end_at-r.start_at)/3600000} hour(s)\nPlayers: ${r.players}\nCourt: ${r.location}\nPaid: PHP ${((r.quoted_total ?? 0)/100).toFixed(2)}\n\nPlease bring water, court shoes, and your paddle if you have one.\nQuestions? Contact 0976 024 2712 or facebook.com/CoachJeremyPickleball.\n\nSee you on court!\nCoach Jeremy`;
}
export async function deliverEmails(env: Env) {
  if (!emailReady(env)) return { sent: 0, connected: false };
  const now = Date.now();
  // Keep retry attempts inside Resend's 24-hour idempotency window.
  await statement(env, "UPDATE email_outbox SET state='review' WHERE state IN ('pending','failed','sending') AND first_attempt_at IS NOT NULL AND first_attempt_at < ?", now-23*3600000).run();
  const items = await statement(env, "SELECT * FROM email_outbox WHERE attempts < 10 AND (state IN ('pending','failed') OR (state='sending' AND last_attempt_at < ?)) ORDER BY rowid LIMIT 10", now-5*60000).all<{ id: string; recipient: string; subject: string; body: string }>();
  let sent = 0;
  for (const item of items.results) {
    const claimed = await statement(env, "UPDATE email_outbox SET state='sending',attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,?),last_attempt_at=? WHERE id=? AND (state IN ('pending','failed') OR (state='sending' AND last_attempt_at < ?))", now,now,item.id,now-5*60000).run();
    if (!claimed.meta.changes) continue;
    try {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': item.id }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [item.recipient], reply_to: env.ALERT_EMAIL || env.ADMIN_EMAIL, subject: item.subject, text: item.body }), signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Email service rejected request');
      await statement(env, "UPDATE email_outbox SET state='sent',sent_at=? WHERE id=?", Date.now(),item.id).run();
      sent++;
    } catch { await statement(env, "UPDATE email_outbox SET state='failed' WHERE id=?",item.id).run(); }
  }
  return { sent, connected: true };
}
