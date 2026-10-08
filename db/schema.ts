import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core';

export const slots = sqliteTable('slots', {
  id: text('id').primaryKey(), startAt: integer('start_at').notNull(), endAt: integer('end_at').notNull(),
  state: text('state').notNull().default('open'),
}, t => [index('slots_start').on(t.startAt), check('slot_state', sql`${t.state} IN ('open','blocked')`), check('slot_duration', sql`${t.endAt} > ${t.startAt}`)]);

export const reservations = sqliteTable('reservations', {
  id: text('id').primaryKey(), slotId: text('slot_id').notNull().references(() => slots.id),
  tokenHash: text('token_hash').notNull(), name: text('name').notNull(), email: text('email').notNull(),
  phone: text('phone').notNull(), location: text('location').notNull(), players: integer('players').notNull(),
  estimatedTotal: integer('estimated_total').notNull(), quotedTotal: integer('quoted_total'), quoteId: text('quote_id'),
  status: text('status').notNull().default('pending_review'), expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(), paymentId: text('payment_id'), confirmedAt: integer('confirmed_at'),
}, t => [
  uniqueIndex('one_active_reservation_per_slot').on(t.slotId).where(sql`${t.status} IN ('pending_review','awaiting_payment','confirmed')`),
  index('reservations_expiry').on(t.status, t.expiresAt),
  check('reservation_status', sql`${t.status} IN ('pending_review','awaiting_payment','confirmed','cancelled','expired')`),
  check('players_range', sql`${t.players} BETWEEN 1 AND 8`),
  check('confirmation_requires_payment', sql`${t.status} != 'confirmed' OR (${t.paymentId} IS NOT NULL AND ${t.confirmedAt} IS NOT NULL)`),
]);

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(), provider: text('provider').notNull(), providerPaymentId: text('provider_payment_id').notNull(),
  reservationId: text('reservation_id').notNull().references(() => reservations.id),
  quoteId: text('quote_id').notNull(), amount: integer('amount').notNull(), currency: text('currency').notNull(),
  receivedAt: integer('received_at').notNull(),
}, t => [uniqueIndex('unique_provider_payment').on(t.provider, t.providerPaymentId)]);

export const emailOutbox = sqliteTable('email_outbox', {
  id: text('id').primaryKey(), reservationId: text('reservation_id').notNull().references(() => reservations.id),
  recipient: text('recipient').notNull(), subject: text('subject').notNull(), body: text('body').notNull(),
  state: text('state').notNull().default('pending'), attempts: integer('attempts').notNull().default(0),
  firstAttemptAt: integer('first_attempt_at'), lastAttemptAt: integer('last_attempt_at'), sentAt: integer('sent_at'),
}, t => [index('outbox_state').on(t.state)]);

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(), count: integer('count').notNull(), windowStart: integer('window_start').notNull(),
});
