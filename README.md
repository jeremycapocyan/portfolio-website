# Coach Jeremy Capocyan

Next.js portfolio and booking calendar for a PhPA Level 1 certified pickleball coach. React, TypeScript, Lucide, custom CSS, and a shared booking engine served by Next.js API routes on Vercel with persistent Turso/libSQL storage.

## Local development

Requires Node.js 24+ (local SQLite uses node:sqlite) and pnpm 10. npm can also run scripts; pnpm owns the committed lockfile.

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

Open http://127.0.0.1:3000. The dev script starts Next.js on port 3000 and a local booking API on loopback port 8787. Data persists in ignored `.sites-runtime/bookings.sqlite`. Daily availability is generated from the coaching hours: 1 PM–8 PM in Asia/Manila. No demonstration bookings are inserted. Restart dev after changing Worker code.

For local coach access, add `LOCAL_ADMIN_ENABLED=true` to ignored `.env.local`, then restart dev. This explicitly enables admin access only on the loopback developer server; the production Worker never implements this bypass. Never expose these dev servers through a tunnel. Local development does not send emails or accept payments.

The build produces a full Next.js application in `.next`, including dynamic `/api/*` routes. `vercel.json` selects this output; do not deploy `out/` or `dist/`. Use `pnpm start` for a production server with the production environment configured.

## Coach workflow

1. Open `/admin` on Vercel. Sign in with **yourvajeremyalonzo@gmail.com** and the admin password configured below. Vercel uses signed, eight-hour, HttpOnly/Secure cookies and strips visitor-supplied Sites identity headers. Sign-in attempts are limited in the database; changing the password hash or session secret invalidates existing sessions.
2. Every day is open automatically from **1 PM to 8 PM, Philippine time (UTC+8)**. Clients choose a duration of **2–7 whole hours** and a start time on the hour. The latest start for a two-hour session is 6 PM. Booking requires at least one hour of notice. No manual opening of each date is needed.
3. Use **Control your availability** to select a date and block specific hours or an entire day. **Reopen these hours** removes a block. The admin preview and client calendar use the same availability API/database. Overlapping reservations and blocks hide every affected start time, including longer sessions. Active reservations cannot be blocked; cancel an unpaid request first. Existing custom entries remain under Additional sessions. Confirmed cancellations/refunds need a future provider-specific workflow.
4. Review client details and court location, then set the **total group quote**. Quotes are immutable; cancel and re-reserve if the agreement changes. Ask the client to refresh their private link to view the quote.
5. Unpaid holds expire at the earlier of 24 hours or the session start, releasing the slot on the next API request. A quote does not extend the hold. Only verified payment confirms a booking.

Clients receive a private status URL containing a random token in its fragment. Save this link after reserving. Tokens are hashed in the database. Public availability never contains client data. Estimates are calculated on the server; guarded database writes reject overlapping time ranges atomically, including reservations with different start times and durations; a unique index also prevents duplicate slot holds.

## Rates and content

- One player: ₱600 per hour per player.
- 2–3 players: ₱500 per hour per player.
- 4–8 players: ₱400 per hour per player.

Players provide the court location; final rates vary by location. Pricing uses text cards without a poster link. CTAs link to [Coach Jeremy Pickleball on Facebook](https://www.facebook.com/CoachJeremyPickleball), phone, and SMS. `app/page.tsx` contains portfolio copy, `app/pricing.tsx` the rates, and `app/booking-calendar.tsx` the calendar. Supplied media is in `public/media`; originals are untouched. Layouts support mobile, keyboard navigation, and reduced-motion preferences.

## Payment integration: intentionally not connected

The owner chose to select a provider later. `worker/payment-provider.ts` is the adapter interface and currently returns null. Checkout and webhooks fail closed. There is no demo payment, unsigned payment callback, or manual paid button. No card data is collected. Reservations cannot become confirmed until a provider is implemented and configured.

Before accepting real payments:

1. Implement hosted HTTPS checkout using the server-created reservation ID, immutable quote ID, exact PHP centavo amount, and hold expiry. Use provider checkout idempotency. Checkout must expire no later than the hold; reconcile asynchronous payment methods before offering them.
2. Verify raw webhook signatures, timestamps/replay windows, production/test environment, and captured/paid status using the provider's current documentation. Normalize trusted metadata into VerifiedPayment. Never trust redirects, client JSON without signature verification, screenshots, or client amounts as payment evidence.
3. Use the existing confirmation transaction. It matches the reservation, quote, amount, currency, active hold, and unique receipt, then queues one confirmation email. Late or mismatched payments require manual reconciliation; they never take a slot from another client. Add provider event monitoring and refund handling before launch.
4. Connect email before enabling checkout. Test the real provider sandbox, retries, late payments, failed emails, and concurrent reservations. Returning from checkout alone never confirms a booking.

## Email connection

`worker/email.ts` has a Resend HTTP adapter and persistent outbox. Configure these runtime values in Vercel Production settings:

| Variable | Purpose |
| --- | --- |
| ADMIN_EMAIL | Admin allowlist: yourvajeremyalonzo@gmail.com |
| ALERT_EMAIL | Booking alerts: yourvajeremyalonzo@gmail.com |
| SITE_URL | Exact hosted origin for mutation origin checks |
| RESEND_API_KEY | Secret API key, not yet supplied |
| EMAIL_FROM | Address on a Resend-verified sender domain, not yet supplied |

The Gmail address receives alerts and replies; it cannot serve as a verified Resend sender domain. Never commit secrets or place them in client variables or the hosting manifest.

Reservations queue coach alerts. Verified payments atomically queue client confirmation emails. No unpaid reservation receives a confirmation email. Delivery runs after booking/payment events and via the dashboard retry button; there is no scheduled retry service yet. Messages remain queued while email is unconfigured. Failed delivery never changes a verified booking back to unpaid.

Retries use stable idempotency keys. Attempts older than 23 hours require manual investigation to avoid exceeding Resend's 24-hour deduplication window. Successful API acceptance is shown as sent; inbox delivery and bounce tracking require provider events. See [Resend email API](https://resend.com/docs/api-reference/emails/send-email) and [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Hosting and migrations

Vercel uses Turso/libSQL through `server/database.ts`. Run `pnpm db:migrate` with the Turso credentials to apply the reviewed SQL in `drizzle/`. Migrations are transactional and recorded with checksums. Keep applied SQL immutable; append later migrations. Request handlers do not create tables. Existing Sites D1 data is separate and is not automatically migrated.

Vercel is the primary hosting target. The old Sites deployment and its access policy are unchanged; `.openai/hosting.json` and the Worker entrypoint remain as historical integration files. The current build targets Vercel, not Sites. Customer booking details stay behind the admin session or a private reservation token.

Integration tests use real in-memory SQLite and the generated migration. They cover authorization, origin checks, month boundaries, overlapping slots, competing/expired reservations, payment validation/replay, and email retries. Tests never send real emails or charge money.

Default availability is generated by `worker/availability.ts`. Blocks persist in `time_blocks`; no recurring database seed is required. Generated sessions are materialized only when a client requests a hold. The existing booking/payment records remain intact. Local and hosted databases remain separate.

## Vercel activation

1. Create a Turso **libSQL/SQLite** database. Add `TURSO_DATABASE_URL` (`libsql://...`) and its database-scoped `TURSO_AUTH_TOKEN` to Vercel Production environment variables. Do not prefix secrets with `NEXT_PUBLIC_`.
2. Securely put the same two values in ignored `.env.local` or your shell environment, then run `pnpm db:migrate`. This applies schema only; it does not import old local/Sites reservations.
3. Run `pnpm admin:setup` in an interactive terminal. Choose and confirm a password of at least 16 characters. The script writes a salted scrypt password hash and random session secret to Git-ignored `.sites-runtime/vercel-admin.env`; it never stores your password. Import those values into Vercel Production. Keep that file private.
4. Required values are `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `ADMIN_EMAIL`, `ALERT_EMAIL`, and `SITE_URL=https://coach-jeremy.vercel.app`, alongside the two Turso values. Use separate databases/secrets for preview deployments.
5. Redeploy the `main` branch. Verify `/api/availability?month=YYYY-MM&hours=2` returns JSON, sign in at `/admin`, and check a block/reopen against the client calendar. Missing configuration returns a clear 503 instead of invented availability.

For password recovery, rerun `pnpm admin:setup`, replace the hash and session secret in Vercel, and redeploy. There is no email-based password reset. Payment and email activation remain separate as described above.
