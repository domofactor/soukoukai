# Soukoukai

An English/Japanese automotive-event discovery MVP for Japan: Japan-only map, circuit/location search, calendar, attendee saved searches and alerts, and a separately subscribed organizer publishing portal. The working product name is provisional.

## Stack and hosting

Next.js App Router, React, TypeScript, PostgreSQL/Prisma, NextAuth email magic links, Stripe subscriptions, Resend alerts, optional server-side DeepL translation, and Leaflet/Natural Earth vector maps. Node.js 22+ is required.

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
5. Add manually verified upcoming events using the operator import below, or let subscribed organizers publish their own clearly labelled listings. Live discovery excludes demos, drafts/withdrawn events, and past listings. Organizer-provided does **not** mean independently verified. A database outage is reported as an error, never replaced with fake events.

## Languages and registration

The header language control switches English/Japanese without clearing the current search filters, and persists the preference in an essential one-year cookie. `?lang=en` / `?lang=ja` supports explicit links (including emailed callbacks); navigation thereafter uses the cookie. Event dates, calendar grouping, form inputs, and alert dates use JST regardless of browser timezone. Circuit names remain searchable in both languages.

Registration uses verified email followed by authenticated onboarding with **Driver**, **Spectator**, or **Event Organizer**. Driver and Spectator are distinct persisted user types sharing **one attendee Pro offering**, not independently priced plans. Organizer has a separate subscription and portal. A sign-in callback's suggested type is not authorization: the authenticated onboarding action validates and persists the choice once. Returning accounts retain their type.

The migration leaves existing users' type **unselected**, rather than guessing Driver or Spectator. They choose on their next account visit. Existing billing rows become `ATTENDEE`; customer/subscription IDs, status, paid-through dates, searches and alerts are preserved, including entitlement checks before selection. Existing billing accounts can select Driver or Spectator, not convert themselves to Organizer. Later category changes require operator assistance and billing reconciliation; no user-controlled role/price switch is exposed. Publish a support contact before launch.

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

Valid disciplines are `GRIP`, `DRIFT`, `MIXED`, `GYMKHANA`, `PVC_DRIFT`, `SHOW`, and `OTHER`. `src/lib/event-types.ts` is the shared source for forms, filters, imports, badges, demo examples and alerts. `priceYen` may be `null` if unknown. Optional `descriptionOriginal` (up to 5,000 characters) and `descriptionLanguage` (`en`/`ja`) must be provided together; an optional human-reviewed `descriptionTranslation` (up to 10,000 characters) is marked edited, never falsely labelled machine-generated.

Stable IDs make imports idempotent. Imports validate all records before an atomic transaction; circuit IDs must already exist. Re-importing updates the listing without resetting its creation/publication time or sending another new-listing alert. Imports refuse to overwrite organizer-owned IDs. Withdraw an operator listing by changing its status to `DEMO` or deleting it through an operator-only database console. Do not expose Prisma Studio publicly.

There is no scraper or editorial admin UI. Confirm redistribution permissions and establish a reliable review/update process before selling access.

## Organizer portal and lifecycle

Use `/organizer` after registering as Event Organizer and subscribing at its separately configured Stripe price. The portal only reads the signed-in organizer's listings; all mutations recheck role, ownership and (where required) subscription on the server. An organizer cannot edit another organizer's or the operator's listings, set verification, or provide their own owner/status/plan fields. Database constraints also separate operator provenance from owned events.

- Active Organizer membership: create/edit drafts, save optional descriptions, automatically translate, edit/retry translations, publish immediately, withdraw and permanently delete.
- Publishing needs a future JST start time and a valid reference circuit, HTTPS source/booking URL, title, organizer name, and event type. A blank entry fee means unknown. Publication is immediate, with **Organizer-provided · not independently verified** displayed in list/calendar cards and alerts. No moderation approval is required.
- A draft's first publication time determines new-listing alert eligibility. Ordinary edits/republication do not reset it or resend delivered alerts. Withdrawal removes it from public search/map/calendar and future sends; deletion also deletes its delivery records. Alert sending rechecks live visibility under a database event lock, serializing with withdrawal/edits.
- Lapsed membership: own-event viewing, withdrawal and deletion remain available; creating, editing, translating and publishing are blocked. Existing published events remain visible until withdrawn/deleted or their start time passes. Organizers are not trapped in a subscription to remove a listing.
- Forms use revisions to reject concurrent/stale saves, including late translation results. Saving a published event updates its public details directly. Save pending form edits before using the separate regenerate action.

Demo mode explains these boundaries without creating accounts, charging, calling translation services, or persisting fictional listings.

## Optional description translation

Set server-only `DEEPL_API_KEY` and `DEEPL_API_PLAN=free` (default) or `pro`. The application uses the corresponding fixed DeepL API endpoint; no key is sent to browsers. New/changed original descriptions are sent to DeepL on save and translated into the opposite language. The original, its language, translation and status are stored separately. Automatic translations are labelled; the organizer can edit them.

**Privacy/setup:** only description text and source/target language are sent to DeepL, from the server. Do not enter personal or confidential data. Review [DeepL's privacy policy](https://www.deepl.com/privacy), contractual processing/retention terms, region requirements and plan limits before enabling it; Free and Pro are not interchangeable privacy commitments. The organizer UI and privacy page disclose the processing. DeepL accounts/keys and billing are not provisioned by this repository.

Missing credentials, timeouts, quota errors, malformed or unchanged provider responses are explicit failures, not fake successful translations. The event and original still save. Organizers can supply a manual translation or retry. A source change preserves user-edited translations but marks them **stale**, hiding them publicly until updated or explicitly regenerated (replacement requires confirmation). Late results cannot overwrite concurrent edits/withdrawal. Clearing the original clears its translation. Public fallback is the labelled original, never stale text presented as current translation.

## Stripe subscriptions

1. In Stripe **test mode**, create separate products/prices for attendee Pro and Organizer. Use active, fixed, licensed, per-unit recurring **JPY** prices. Choose amounts/cadence yourself; no unapproved amount is hard-coded. Set `STRIPE_SECRET_KEY`, `STRIPE_ATTENDEE_PRICE_ID` and `STRIPE_ORGANIZER_PRICE_ID`; they **must be distinct**. Driver and Spectator use the attendee price, not separate prices.
2. Register `/api/stripe/webhook` and subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Set the endpoint's `STRIPE_WEBHOOK_SECRET`.
3. Enable Stripe's customer billing portal for cancellation and payment-method updates. **Disable product/plan changes in the portal**: category conversion requires operator assistance. Configure public business details, tax treatment, and receipts.
4. Test magic-link sign-in, purchase, webhook retries, renewal, failed payment, cancellation at period end, and portal access using Stripe test mode before switching to live keys.

For local webhook forwarding:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the signing secret printed by that listener locally. Never mix test/live credentials or commit secrets.

Only signed webhooks update entitlements; a successful browser redirect never grants access. Handlers reconcile against live Stripe subscription state and matching configured price IDs, not client metadata. Checkout derives the plan from the persisted account type and ignores client-supplied prices/roles. Attendee pricing cannot grant organizer access; Organizer membership does not grant attendee saved-search access. Only `active`/`trialing` subscriptions with an unexpired period and the correct plan unlock the relevant features. Cancellation at period end retains access until that end; `past_due`, `unpaid`, expired, and canceled subscriptions do not. Existing subscriptions are directed to account/portal management rather than intentionally starting a second subscription.

**Upgrade compatibility:** `STRIPE_PRICE_ID` remains a supported legacy attendee checkout fallback and an accepted attendee subscription price even when `STRIPE_ATTENDEE_PRICE_ID` is set. Keep its old value while any existing subscribers use it. It must not equal the Organizer price. Do not remove old price configuration or switch test/live keys without reconciling existing subscriptions.

## Scheduled email alerts

Set `RESEND_API_KEY`, a verified `EMAIL_FROM`, and a long random `CRON_SECRET`. Configure an external scheduler to invoke:

```sh
curl --fail-with-body \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.example/api/cron/alerts
```

Run hourly or more frequently, and monitor failures. The endpoint processes up to 50 deliveries per run; rerun if `moreWorkMayRemain` is true. At larger scale, move delivery processing to a queue.

Users explicitly opt in when saving a search. Only newly **first-published**, upcoming matching verified or organizer-provided listings trigger mail, not old listings or updates. Draft creation alone does not count. Provenance, event type and available description are included. Email uses the language selected when the search was saved; existing searches retain English. Search dates are fixed rather than rolling. Browser geolocation is never persisted; save a circuit or region for recurring searches. Users stop alerts by deleting the search. Expired attendee Pro accounts retain their searches but cannot open them as a paid feature or receive alerts.

Unique, durably reserved database delivery records plus Resend idempotency keys protect against immediate retries and concurrent sends. Reservations persist even if sending or its transaction fails. Resend keys expire after 24 hours: unresolved deliveries older than 23 hours fail explicitly. Reconcile those records against provider logs (mark `sentAt` if delivered; otherwise delete the undelivered record to retry) rather than blindly resending. Alert email content links to the account page for stopping future alerts.

## Map data and validation

The Japan-only Leaflet vector layer is bundled locally: Natural Earth 1:10m Admin 0 Japan geometry (109 polygons, including Okinawa, Ryukyu and Ogasawara islands). Other countries and global tiles are not rendered. Pan/zoom is bounded to Japan's extent, with an All Japan control. There is no tile key, external tile request or tile outage dependency. List/calendar do not depend on map initialization.

Natural Earth is public domain, including commercial redistribution. Source, pinned revision and attribution are retained in `src/data/NOTICE`, the map attribution and About page. This is a generalized reference map, not turn-by-turn navigation or an assertion about territorial boundaries.

`npm test` includes embedded PostgreSQL (PGlite) migration/legacy-data checks, role/ownership/lapse and plan-isolation regressions, all event types across imports/search/alerts, translation failure/preservation cases, geography fixtures, and locale-link checks. Provider tests use injected responses and never contact DeepL. The normal lint/typecheck and demo production build require no service credentials.

## Launch checklist and boundaries

- Use licensed real listings with truthful source labels; validate circuit coordinates, URLs, regional classifications, and organizer booking links.
- Add operator identity/contact, account-deletion handling, retention rules, terms/refund policy, and Japan's applicable commercial disclosures (including Specified Commercial Transactions Act information). The included privacy page explicitly identifies these pre-launch gaps.
- Configure backups, monitoring for webhook/cron failures, email deliverability, and edge-level abuse/rate limits for sign-in and public routes. Do not launch paid access without these operational and legal steps.
- Review Japanese copy and automatic translation quality with a native-speaking operator; user-entered titles/organizer names are preserved, not silently translated. The directory is not exhaustive and does not sell tickets or guarantee availability.
- A commercial host, PostgreSQL, SMTP, separate Stripe prices, and alert scheduler must be connected by the operator; DeepL is optional and requires separate setup. Repository changes alone do not provision accounts or activate payments.
- Live SMTP magic links, real PostgreSQL/Prisma deployment, Stripe test/live checkout/portal/webhook reconciliation and Resend delivery need deployment-environment smoke tests with real credentials. Embedded migration tests and demo previews do not certify those external integrations.
