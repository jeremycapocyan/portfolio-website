# Coach Jeremy Capocyan

Next.js portfolio and booking calendar for a PhPA Level 1 certified pickleball coach. React, TypeScript, Lucide, custom CSS, and a Cloudflare-compatible Worker with persistent Sites D1 storage.

## Local development

Requires Node.js 24+ (local SQLite uses node:sqlite) and pnpm 10. npm can also run scripts; pnpm owns the committed lockfile.

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

Open http://127.0.0.1:3000. The dev script starts Next.js on port 3000 and a local booking API on loopback port 8787. Data persists in ignored `.sites-runtime/bookings.sqlite`. No demonstration slots are inserted. Restart dev after changing Worker code.

For local coach access, add `LOCAL_ADMIN_ENABLED=true` to ignored `.env.local`, then restart dev. This explicitly enables admin access only on the loopback developer server; the production Worker never implements this bypass. Never expose these dev servers through a tunnel. Local development does not send emails or accept payments.

The build exports Next.js and bundles the API into `dist/server/index.js`. Assets are in `dist/client`; migration metadata is in `dist/.openai/drizzle`. The full app needs a Worker and D1. Deploying only `out/` will not provide bookings. `next start` is not used with static export.

## Coach workflow

1. Open `/admin` on the hosted site. Sign in using the ChatGPT account with email **yourvajeremyalonzo@gmail.com**. Every admin API route enforces this allowlist using trusted Sites identity headers.
2. Add open or blocked sessions in Philippine time (UTC+8). Each range is one session for one group. Sessions start at least one hour ahead, last 1–12 hours in 30-minute increments, and cannot overlap.
3. Edit, block, or reopen unreserved sessions. Reserved times cannot be edited; cancel an unpaid request first. Confirmed booking cancellations/refunds require a future provider-specific workflow.
4. Review client details and court location, then set the **total group quote**. Quotes are immutable; cancel and re-reserve if the agreement changes. Ask the client to refresh their private link to view the quote.
5. Unpaid holds expire at the earlier of 24 hours or the session start, releasing the slot on the next API request. A quote does not extend the hold. Only verified payment confirms a booking.

Clients receive a private status URL containing a random token in its fragment. Save this link after reserving. Tokens are hashed in the database. Public availability never contains client data. Estimates are calculated on the server; guarded database writes and a unique index prevent double bookings.

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

`worker/email.ts` has a Resend HTTP adapter and persistent outbox. Configure these runtime values in Sites:

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

`.openai/hosting.json` preserves the Sites project and declares D1 binding `DB`. Production schema changes come only from reviewed Drizzle migrations. Run `pnpm exec drizzle-kit generate` after editing `db/schema.ts`. Keep applied SQL and metadata immutable; append later migrations. Request handlers do not create tables.

The hosted audience remains private until separately shared with clients. Production must run behind Sites, which owns sign-in and trusted identity headers; do not expose the Worker directly with client-supplied identity headers. Another hosting provider requires replacing this auth integration. Customer booking details are private server-side data.

Integration tests use real in-memory SQLite and the generated migration. They cover authorization, origin checks, month boundaries, overlapping slots, competing/expired reservations, payment validation/replay, and email retries. Tests never send real emails or charge money.
