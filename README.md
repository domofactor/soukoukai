# Soukoukai

An automotive track-day discovery MVP for Japan: map, circuit/location search, calendar, and subscription-backed saved searches and email alerts. The working product name is provisional.

## Stack and hosting

Next.js App Router, React, TypeScript, PostgreSQL/Prisma, NextAuth email magic links, Stripe subscriptions, Resend alerts, and Leaflet/OpenStreetMap maps. Node.js 22+ is required.

Deploy to a commercial Node-capable host, such as Vercel, Render, or Railway, with managed PostgreSQL. **Do not deploy the paid service on GitHub Pages:** it cannot run this backend and [its usage rules prohibit primarily commercial SaaS hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## Local preview

```sh
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:3000. `.env.example` explicitly enables `DEMO_MODE=true`. No services or credentials are needed in this mode. Demo dates, prices, organizers, and events are fictional and labelled throughout; circuit locations are approximate reference data. Membership actions are disabled rather than simulated.

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

Production preview also requires `DEMO_MODE=true` in the runtime environment. Prisma CLI commands read `.env`; Next.js also supports `.env.local`.

## Enable live data and sign-in

1. Provision PostgreSQL and set `DATABASE_URL`. Use a pooled connection appropriate for the deployment; run migrations with a connection supported by your provider.
2. Run `npm run db:migrate` and `npm run db:seed`. The seed upserts the circuit directory only; it never creates fictional live events.
3. Set `DEMO_MODE=false`, an exact canonical `NEXTAUTH_URL` (HTTPS in production), and a random `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
4. Configure `EMAIL_SERVER` with an SMTP URL and `EMAIL_FROM` with a verified sender. SMTP credentials must be URL-encoded. The example uses Resend SMTP, but another SMTP provider can send sign-in links.
5. Add manually verified upcoming events. Live discovery excludes demo, unverified, and past listings. A database outage is reported as an error, never replaced with fake events.

### Publishing events

Import a JSON array with the following shape. Values below illustrate the schema only; they are **not a real event**. Replace every field with verified organizer information.

```json
[
  {
    "id": "unique-organizer-event-id",
    "title": "Verified event title",
    "organizer": "Official organizer name",
    "circuitId": "tsukuba",
    "startsAt": "2027-01-15T09:00:00+09:00",
    "priceYen": 18000,
    "discipline": "GRIP",
    "beginner": true,
    "sourceUrl": "https://organizer.example/actual-event",
    "verifiedAt": "2026-11-19T12:00:00+09:00"
  }
]
```

```sh
npm run events:import -- path/to/events.json --confirm-verified
```

Valid disciplines are `GRIP`, `DRIFT`, and `MIXED`; `priceYen` may be `null` if unknown. Stable IDs make imports idempotent. Imports validate all records before an atomic transaction; circuit IDs must already exist. Re-importing updates the listing without resetting its creation time or sending another new-listing alert. Withdraw a listing by changing its status to `DEMO` or deleting it through an operator-only database console. Do not expose Prisma Studio publicly.

There is no scraper, organizer integration, or editorial admin UI in this MVP. Confirm redistribution permissions and establish a reliable review/update process before selling access.

## Stripe subscriptions

1. In Stripe **test mode**, create a product and an active fixed-price recurring **JPY** price. Choose your own price/cadence; no unapproved amount is hard-coded. Set `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`.
2. Register `/api/stripe/webhook` and subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Set the endpoint's `STRIPE_WEBHOOK_SECRET`.
3. Enable Stripe's customer billing portal, including cancellation and payment-method updates. Configure public business details, tax treatment, and receipts.
4. Test magic-link sign-in, purchase, webhook retries, renewal, failed payment, cancellation at period end, and portal access using Stripe test mode before switching to live keys.

For local webhook forwarding:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the signing secret printed by that listener locally. Never mix test/live credentials or commit secrets.

Only signed webhooks update entitlements; a successful browser redirect never grants access. Handlers reconcile against live Stripe subscription state and can safely replay deliveries. Only `active`/`trialing` subscriptions with an unexpired period unlock Pro. Cancellation at period end retains access until that end; `past_due`, `unpaid`, expired, and canceled subscriptions do not unlock Pro. Existing subscriptions are directed to the billing portal instead of intentionally starting a second subscription.

## Scheduled email alerts

Set `RESEND_API_KEY`, a verified `EMAIL_FROM`, and a long random `CRON_SECRET`. Configure an external scheduler to invoke:

```sh
curl --fail-with-body \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.example/api/cron/alerts
```

Run hourly or more frequently, and monitor failures. The endpoint processes up to 50 deliveries per run; rerun if `moreWorkMayRemain` is true. At larger scale, move delivery processing to a queue.

Users explicitly opt in when saving a search. Only newly created, verified, upcoming matching listings trigger mail, not old listings or updates. Search dates are fixed rather than rolling. Browser geolocation is never persisted; save a circuit or region for recurring searches. Users stop alerts by deleting the search. Expired Pro accounts retain their searches but cannot open them as a paid feature or receive alerts.

Unique database delivery records plus Resend idempotency keys protect against immediate retries and concurrent sends. Resend keys expire after 24 hours: unresolved deliveries older than 23 hours fail explicitly. Reconcile those records against provider logs (mark `sentAt` if delivered; otherwise delete the undelivered record to retry) rather than blindly resending. Alert email content links to the account page for stopping future alerts.

## Launch checklist and boundaries

- Replace all demo content with verified licensed listings; validate circuit coordinates, URLs, regional classifications, and organizer booking links.
- Add operator identity/contact, account-deletion handling, retention rules, terms/refund policy, and Japan's applicable commercial disclosures (including Specified Commercial Transactions Act information). The included privacy page explicitly identifies these pre-launch gaps.
- Configure backups, monitoring for webhook/cron failures, email deliverability, and edge-level abuse/rate limits for sign-in and public routes. Do not launch paid access without these operational and legal steps.
- OpenStreetMap tiles are suitable only within the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/); use a suitable hosted tile provider at higher traffic. Map failures leave the list and calendar usable.
- The UI is English with Japanese circuit names, not a fully localized Japanese product. The directory is not exhaustive and does not sell event tickets or guarantee availability.
- A commercial host, database, SMTP, Stripe, and alert scheduler must be connected by the operator. Repository changes alone do not provision accounts or activate payments.
