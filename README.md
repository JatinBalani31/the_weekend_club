# Weekend Run Club — Website Plan & Build Prompts

## 1. What you're building

A mobile-first website that:
- Shows banners + a description of the club ("run portal")
- Displays upcoming events/workshops in a clean window/grid
- Lets people register for a workshop through a form (no manual WhatsApp back-and-forth)
- Takes payment online (registration fee) and confirms automatically
- Links out to your WhatsApp community and Strava club
- Is cheap to run, cheap to maintain, and can grow into ticketed/paid runs and music events later

Traffic pattern to design for: someone taps a link in your Instagram bio or a story → lands on mobile → reads about the event → registers → pays → gets a confirmation. Every screen should assume a phone screen first.

---

## 2. Recommended architecture (low-cost, low-maintenance)

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | **Next.js** (React) | One framework does your marketing pages *and* your registration form *and* your backend API routes. No separate backend server to maintain. |
| Hosting | **Vercel** (free "Hobby" tier to start) | Deploys straight from GitHub, free SSL, fast on mobile, scales automatically. Paid tier only needed once traffic is serious. |
| Database | **Supabase** (free tier) | Postgres database + built-in auth + storage for banner images, all in one dashboard. No DB server to patch or babysit. |
| Payments | **Razorpay** (India-first, supports UPI/cards/netbanking) | Best fit since you're in India — UPI is what most of your members will actually use. Has a hosted "Payment Links" option (near-zero code) and a full Checkout SDK (more control) for when you want it. |
| Domain | Any registrar (Namecheap / GoDaddy / Google Domains successor) — a `.com` or `.run` or `.club` | ~₹800–1500/year. Point it at Vercel with a DNS record — 10 minute job. |
| Notifications | **Resend** or **EmailJS** (free tier) for confirmation emails; WhatsApp stays manual/community-link for now | Avoids paying for WhatsApp Business API until you actually need automated WhatsApp messages. |
| Admin view | A simple password-protected `/admin` page in the same Next.js app, reading from Supabase | Avoids building a second app just to see who registered. |

**Monthly cost at your current scale: ₹0.** You only start paying when: (a) you outgrow Vercel/Supabase free tiers (thousands of visits/rows), or (b) Razorpay takes its standard transaction fee (~2% per payment) — that's normal and scales with revenue, not a fixed cost.

### Why this over alternatives
- **WordPress/Wix**: faster to start, but registration + payment logic gets clunky and plugin-dependent, and it gets messy exactly when you want custom features (music events, ticket tiers).
- **Separate backend (Node/Express) + separate frontend**: more moving parts to host and secure for no real benefit at your scale. Next.js API routes give you a backend without a second deployment.
- **Google Forms + payment link pasted in**: works for week 1, but it's manual, doesn't feel professional on Instagram, and won't scale to ticket tiers or the music events you're planning.

### How this scales into your future plans
- **Monetizing runs** → same registration flow, just add a `price` and `event_type` field per event; Razorpay already handles this.
- **Rave/music events** → same architecture — Supabase table just gets new event categories (e.g. `type: "music"` vs `type: "run"`), maybe ticket tiers (early bird / regular) as extra columns.
- **Team scales up** → Supabase gives you a real relational database from day one, so you're never migrating off a "toy" backend.

---

## 3. Site structure (pages)

```
/                 → Home: hero banner(s), club description, WhatsApp + Strava links,
                    "Upcoming Events" preview strip, CTA to view all events
/events           → Full list/grid of upcoming (and past) events
/events/[slug]     → Single event detail page: description, date, location, price,
                    "Register" button
/register/[slug]  → Registration form → triggers Razorpay payment → success page
/success          → Confirmation screen + "Join WhatsApp" + "Follow on Strava" CTAs
/admin            → Password-protected list of registrations (simple table + CSV export)
```

Data model (Supabase tables), kept intentionally simple:
- `events`: id, title, slug, description, banner_image_url, date, location, price, capacity, event_type (run/workshop/music), is_active
- `registrations`: id, event_id, name, email, phone, strava_handle (optional), email_updates (optional consent), payment_status, payment_id, created_at

---

## 4. Phase-wise build plan + copy-paste agent prompts

Use these with a coding agent (Claude Code, Cursor, etc.) one phase at a time. Complete the phase, run its validation checks, review the diff, and commit to GitHub before moving on. Each prompt assumes the previous phase is complete; do not paste all phases into an agent at once.

### Phase 0 — Project setup
```
You are setting up the foundation for a mobile-first running club website called "the Weekend Club".

Requirements:
- Use Next.js 14, App Router, TypeScript, Tailwind CSS, ESLint, and npm.
- Keep the project at the repository root. Use /app, /components, /lib, and create /supabase/migrations for future SQL migrations.
- Add a root layout with metadata, viewport-fit=cover, and padding using env(safe-area-inset-bottom). Do not rely on hover for required interactions.
- Use next/font for the initial font and expose semantic display and body families through Tailwind so fonts can be swapped later.
- Define theme tokens in tailwind.config.ts for background, foreground, accent, ink, and paper. Use one energetic accent color only.
- Add .env.example with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, and ADMIN_PASSWORD.
- Ignore .env.local, .env.*.local, .next, node_modules, build output, and Vercel metadata. Never commit real secrets.
- Create a minimal /app/page.tsx that renders "Hello World". Do not add database, payment, email, or authentication logic in this phase.

Validation:
- Run npm run build and confirm TypeScript and ESLint pass.
- Start npm run dev and confirm the root route returns HTTP 200.
- Report the Node.js, npm, and Next.js versions used.
```

### Phase 1 — Homepage: banners, description, community links
```
Build the first visual identity for the Weekend Club homepage in /app/page.tsx.

Requirements:
- Assume over 90% of first visits come from Instagram or WhatsApp on a phone.
- Use a bold outdoorsy-athletic style: high-contrast dark hero, off-white content areas, and exactly one energetic accent color.
- Create components/HeroCarousel.tsx with a typed slides prop. The slide type must be exactly { image, headline, ctaText, ctaHref }.
- Support 2-3 slides, next/image with fill or explicit dimensions, responsive sizes, 5-second autoplay, tap indicators, touch swipe, and pausing after touch/manual navigation before resuming after inactivity.
- Give every interactive target at least 44px by 44px, add a readable gradient overlay, and do not make any required behavior depend on hover.
- Add a short About section with placeholder copy and a compact stat row.
- Add WhatsApp, Strava, and Instagram cards with icons, labels, descriptions, clearly marked placeholder URL constants, target=_blank, and rel=noopener noreferrer. Keep icons cohesive rather than using brand colors.
- Define placeholder events in exactly this shape: id, title, slug, description, banner_image_url, date, location, price, capacity, event_type, is_active, created_at.
- Show up to three event cards with image, title, formatted date, description, location, and event type badge. Add a View All link to /events.
- Use Tailwind theme classes rather than scattered hex values. Ensure no horizontal overflow from 320px upward.

Validation:
- Run npm run build.
- Test 320px, mobile, tablet, and desktop viewports.
- Verify keyboard focus, touch-sized controls, stable image layout, autoplay, manual navigation, and swipe behavior.
```

### Phase 2 — Supabase setup + dynamic events
```
Integrate Supabase into the Next.js project. Create the SQL schema for two tables: `events`
(id, title, slug, description, banner_image_url, date, location, price, capacity, event_type,
is_active, created_at) and `registrations` (id, event_id references events, name, email,
phone, strava_handle, payment_status, payment_id, created_at). Write the SQL migration file.
Then replace the hardcoded event data on the homepage and build a new /events page to fetch
and display events from Supabase instead, sorted by date, only showing is_active = true and
future dates. Add an /events/[slug] page that fetches and shows full event details with a
"Register Now" button linking to /register/[slug].

Implementation requirements:
- Create a timestamped migration under /supabase/migrations. Use uuid ids, a unique slug, timestamptz date, non-negative price, positive capacity, event_type restricted to run/workshop/music, is_active default true, and created_at defaults.
- Add registrations with an event_id foreign key, required name/email/phone, optional strava_handle, payment_status restricted to pending/paid/failed with pending default, optional payment_id, and created_at.
- Add indexes for active event date, registration event_id, and registration created_at.
- Enable RLS on both tables. Allow anon/authenticated users to read only active future events. Do not allow public reads or inserts into registrations.
- Create a public Supabase client and a server-only service-role client. Never import the service-role client into a client component or expose its key.
- Add typed event query helpers that filter is_active=true and date greater than now, order by date ascending, and safely handle missing credentials/errors.
- Reuse a typed EventCard for the homepage and /events. Use notFound() for unavailable /events/[slug] values.

Validation:
- Apply the migration in a disposable Supabase project and insert active/future, inactive/future, and active/past fixtures.
- Confirm only active/future rows appear, registrations are not publicly readable, and unknown slugs return 404.
- Run `npm run build` and check that the service-role key is server-only.
```

### Phase 3 — Registration form
```
Build the /register/[slug] page: a mobile-friendly registration form (name, email, phone,
optional Strava handle) for the event matching the slug, using React Hook Form with basic
validation (valid email, valid phone number format for India). On submit, create a
`registrations` row in Supabase with payment_status = "pending" and return the new
registration id. Show a loading state while submitting. Do not integrate payment yet —
after successful form submission, just redirect to a placeholder /success page for now.

Implementation requirements:
- Resolve the active future event by slug server-side and show notFound() for unavailable events.
- Use React Hook Form with name, email, phone, and optional Strava handle. Validate a normal email and Indian phone numbers beginning 6-9, accepting optional +91 and spaces/hyphens.
- Show field errors, preserve input, and disable the submit button with a loading label while submitting.
- Submit to /api/registrations. Parse and validate JSON again on the server; do not trust client validation.
- Resolve the event again server-side, then insert event_id, name, email, phone, strava_handle, and payment_status='pending' with the service-role client. Return only the new id.
- Redirect to /success?registration_id=<id> and do not claim payment succeeded yet.
- Handle malformed JSON, unavailable events, missing credentials, database errors, and duplicate submissions clearly. Add rate limiting or document the chosen low-traffic protection strategy.

Validation:
- Test valid/invalid input on phone-sized screens and test malformed JSON, invalid email/phone, unknown event, and missing credentials.
- Confirm one valid request creates exactly one pending registration and returns its id.
- Run `npm run build` and verify no private key reaches the browser.
```

### Phase 4 — Razorpay payment integration
```
Integrate Razorpay into the registration flow. After a registration row is created with
payment_status "pending", create a Razorpay order via a Next.js API route
(/app/api/create-order/route.ts) using the event's price. Open the Razorpay Checkout modal
on the client with that order. On successful payment, verify the payment signature server-side
in another API route (/app/api/verify-payment/route.ts), and update the registration's
payment_status to "paid" and store the payment_id in Supabase. On verification failure or
user cancellation, keep payment_status as "pending" or "failed" and show a retry option.
Redirect to /success only after payment is verified as "paid". Use env variables for
Razorpay key id and key secret, and add them to .env.example.

Implementation requirements:
- Only RAZORPAY_KEY_ID may reach the client. Keep RAZORPAY_KEY_SECRET server-only.
- Create /api/create-order/route.ts. Load the registration and event server-side, confirm pending and active/future status, and calculate the amount from event.price in the smallest currency unit. Never accept the amount from the browser.
- Store the Razorpay order id if needed and make retries idempotent for a pending registration.
- Load Checkout only in a client component. Show loading, cancellation, failure, and retry states.
- Verify razorpay_order_id, razorpay_payment_id, and razorpay_signature server-side with HMAC-SHA256 over order_id|payment_id and timing-safe comparison.
- Confirm the order belongs to the registration, mark paid, and store payment_id only after valid verification. Repeated callbacks must not duplicate updates.

Validation:
- Test Razorpay test credentials, success, cancellation, failure, refresh, duplicate callback, tampered signature, and amount tampering.
- Confirm secrets are absent from browser bundles and run `npm run build`.
```

### Phase 5 — Confirmation + success page
```
Build the /success page shown after successful payment: show a confirmation message with the
event name and date, a "Add to Calendar" button (generate a .ics file client-side), and the
WhatsApp community + Strava links again as clear CTAs. Also add an email confirmation: after
payment is verified in the /api/verify-payment route, send a confirmation email to the
registrant using Resend (or EmailJS if simpler), including event details and the WhatsApp
community link. Add RESEND_API_KEY and RESEND_FROM_EMAIL to .env.example.

Implementation requirements:
- Accept registration_id on /success and load the matching registration through a server-only helper. Never expose private registration data for an arbitrary event slug.
- Show the event title, local date/time, location, and accurate payment/registration status. Do not claim payment succeeded when payment_status is not paid.
- Add a client-only Add to Calendar button that downloads a valid RFC 5545 .ics file with escaped title/location, DTSTART, DTEND, UID, and timezone-safe values. Use a minimum 44px tap target.
- Add WhatsApp and Strava CTAs using shared constants, target=_blank, and rel=noopener noreferrer. Include Instagram if it is part of the site identity.
- In the server-side verified-payment path, send email only after valid payment verification and a successful database update. Include the registrant name, event title, date/time, location, and WhatsApp link.
- Use a verified Resend sender and plain-text fallback. Do not log keys or full personal data.
- Make confirmation email delivery idempotent with a confirmation_sent_at column or equivalent reliable mechanism, so duplicate callbacks do not send duplicate emails. Document whether email failure blocks payment confirmation.

Validation:
- Download and inspect the .ics file in a calendar application.
- Test missing, pending, paid, and duplicate confirmations plus Resend success/failure.
- Run `npm run build`.
```

### Phase 6 — Simple admin view
```
Build a password-protected /admin page (simple shared-password gate stored in an env
variable, not full user auth — this is a low-traffic internal tool) that lists all
registrations from Supabase in a table: name, email, phone, event, payment_status, date
registered. Add filtering by event and a "Export to CSV" button. Keep it minimal — no
design polish needed here, just functional.

Implementation requirements:
- Use ADMIN_PASSWORD from the environment. Never put it in client code, HTML, logs, or query strings.
- Create a server-side login endpoint that compares the password, then sets a signed httpOnly, sameSite cookie with a limited lifetime. Use a timing-safe comparison where applicable.
- Protect /admin before loading registrations. Unauthenticated users must receive only the login form. Add logout that expires the cookie.
- Use the service-role Supabase client only on the server to load registrations joined to event title. Do not expose payment secrets or unnecessary private fields.
- Show name, email, phone, event, payment_status, and date registered in a functional table.
- Add an event filter and CSV export for the currently filtered rows. Quote and escape CSV values correctly.
- Handle missing credentials, empty data, unknown events, and database errors without exposing internals. Document basic brute-force protection for this low-traffic tool.

Validation:
- Test unauthenticated access, wrong password, missing ADMIN_PASSWORD, successful login, logout, expired cookie, filtering, and CSV export.
- Confirm service-role credentials never reach the browser.
- Run `npm run build`.
```

### Phase 7 — Deployment
```
Prepare this Next.js project for production deployment on Vercel. Check for any hardcoded
values that should be environment variables, confirm .env.example lists everything needed
(Supabase URL/key, Razorpay key id/secret, Resend/EmailJS key, admin password), add a
README with setup + deployment steps, and make sure build passes with `next build` with no
errors. List out, step by step, exactly what I need to do in the Vercel dashboard and my
domain registrar's DNS settings to connect my custom domain.

Implementation requirements:
- Review all hardcoded URLs, secrets, sender addresses, admin credentials, event images, and payment values. Move deploy-specific or sensitive values into environment variables; keep only intentional placeholder content marked TODO.
- Confirm .env.example lists NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, and ADMIN_PASSWORD with no real values.
- Confirm service-role, Razorpay secret, Resend key, and admin password are used only in server files/routes.
- Confirm .gitignore excludes local env files, .next, node_modules, build output, and Vercel metadata. Search Git history for accidentally committed secrets and explain remediation if found.
- Document local setup, migration application, seed data, payment test mode, Resend domain verification, admin access, privacy/refund policy, and missing-environment troubleshooting.
- In Vercel, import the GitHub repository, keep the Next.js root directory, add all environment variables with deliberate Production/Preview/Development scopes, deploy, and inspect build logs.
- Use separate test credentials for Preview where possible. Configure production Razorpay only after test checkout succeeds. Apply migrations to the intended Supabase project and verify RLS.
- For a custom domain, add it in Vercel, use the exact records Vercel displays, typically A @ -> 76.76.21.21 and CNAME www -> cname.vercel-dns.com, remove only conflicting web records, preserve MX/TXT mail records, wait for propagation, and choose one canonical domain.

Validation:
- Run `npm run build`, `npm run lint`, and a production `npm start` smoke test.
- Test deployed homepage, events, registration, payment, email, and admin flows with non-production credentials.
- Record the deployment URL, domain status, environment-variable scopes, migration version, and known limitations.
```

### Phase 8 (later) — Monetized runs & music events
```
Extend the events schema and UI to support multiple event_types ("run", "workshop", "music")
and optional ticket tiers per event (e.g. "early_bird", "regular", stored as a new
`ticket_tiers` table linked to events: id, event_id, name, price, capacity, sale_ends_at).
Update the registration and payment flow so a user picks a tier before paying, and the
Razorpay order amount reflects the selected tier's price. Update the admin view to show
tier breakdown per event.

Implementation requirements:
- Preserve existing run, workshop, and music event types and existing registrations.
- Add a ticket_tiers table with id, event_id foreign key, name, non-negative price, positive capacity, sale_ends_at, is_active, and created_at. Add indexes for event_id and sale_ends_at plus RLS exposing only active tiers for active future events.
- Decide whether existing events receive an explicit default tier or use a compatibility fallback. Document the migration and rollback strategy.
- Add selected tier id and captured price to registrations so historical payment records do not change when a tier is edited.
- Add tier selection to event detail and registration pages with price, availability, sale-end, and sold-out states.
- Server-side order creation must load the selected tier and calculate the Razorpay amount from the database. Never accept price or amount from browser input.
- Enforce capacity and sale-end checks under concurrent requests using an appropriate transaction/locking strategy. Explain the choice.
- Keep payment verification, idempotency, confirmation email, calendar data, and admin CSV exports compatible with tiers.
- Add tier filters and per-tier registration/payment counts to the admin dashboard. Give music events a compatible content treatment without introducing a second visual system.

Validation:
- Test free/paid, expired, sold-out, concurrent capacity, payment retry, duplicate callback, refund/manual failure, and historical price scenarios.
- Add focused tests for amount calculation, capacity enforcement, and tier authorization.
- Run `npm run build` and document the production migration plan before release.
```

---

## 5. A few practical notes for launch

- **Instagram bio link**: once deployed, put your homepage or a specific event page URL directly in your Instagram bio, and use "Link in bio" stickers on stories pointing to `/events/[slug]` for a specific workshop.
- **Payment fees**: Razorpay charges roughly 2% per transaction (varies by payment method) — factor that into your registration price if you want a clean round number to land in your account.
- **Backups**: Supabase free tier does daily backups for a short retention window — fine for launch, just know it's not indefinite.
- **Domain**: buy the domain separately from hosting (registrar ≠ Vercel) — this is normal and keeps you portable if you ever change hosts.
- **Legal/compliance**: since you're collecting payments, add a simple refund/cancellation policy page — Razorpay (and some app stores if you ever go that route) expect this to be visible.

## Production setup and deployment

### Create a Supabase project

Everything — events, registrations, admin settings, visitor accounts — lives in Supabase. If you don't have a project yet:

1. Go to [supabase.com](https://supabase.com), sign in, and click **New project**. Pick any name/region and a database password (save it somewhere; it's separate from the API keys below).
2. Wait for provisioning (~2 minutes), then open the **SQL Editor**.
3. Open each file in `supabase/migrations/` in this repo, in filename order (they're timestamped), paste its contents into the SQL Editor, and run it. Repeat for every file — each one only adds what the previous ones didn't have.
4. Go to **Project Settings → API**. Copy the **Project URL**, the **anon / public** key, and the **service_role** key (click "Reveal" — keep this one secret, it bypasses row-level security).
5. Paste those three into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

### Run locally

1. Install dependencies with `npm install`.
2. `.env.local` already exists in this project with a dev `ADMIN_PASSWORD` and `SESSION_SECRET` generated for you — it's gitignored, never commit it.
3. Start the site with `npm run start` (or `npm run dev` — they do the same thing). Both run the Next.js dev server with hot reload, so edits appear immediately without rebuilding. Use `npm run start:prod` when you specifically want a production build served locally.
4. Open `/admin`, sign in with `ADMIN_PASSWORD`, go to the **Events** tab, and create an event. It appears immediately on `/` and `/events`, and you can register for it.

**No Supabase needed to start.** When Supabase credentials are absent, the app stores events, registrations, and accounts in `.data/dev-db.json` (gitignored) so the whole flow works offline. Set the Supabase variables and it switches to Postgres automatically — `lib/devStore.ts` is bypassed entirely whenever `SUPABASE_SERVICE_ROLE_KEY` is present. To reset local data, delete the `.data/` folder.

Razorpay keys are also optional locally: **events priced at 0 skip payment entirely** and are marked paid, which is the easiest way to test the registration flow. Paid events need real Razorpay keys.

Going to production: fill in the Supabase values (see above), apply every file in `supabase/migrations/` in filename order, then add your Razorpay and Resend keys.

### Admin console

`/admin` is a single shared login (no per-user accounts) protected by `ADMIN_PASSWORD`:

1. Enter `ADMIN_PASSWORD` to reach the dashboard. Two-factor authentication is **not enabled right now** — the TOTP helpers in `lib/admin.ts` and the `admin_settings` table are staged for when it's switched back on, but nothing calls them today.
2. The **Events** tab creates, edits, deactivates, and deletes events and their ticket tiers. Deleting is only allowed for events with zero registrations — deactivate an event instead once it has registrants, so historical registration data is preserved.
3. The **Registrations** tab shows summary counts (total/paid/pending/failed, and a per-event breakdown) and an **Export to Excel** button that downloads a `.xlsx` workbook with a Summary sheet and a full Registrations sheet (name, email, phone, Strava handle, ticket tier, amount charged, payment status, opt-in, and registration date).
4. While signed in as admin, the site nav shows only an **Admin** marker and **Sign out** — no visitor profile options.

### Visitor accounts

Regular visitors can optionally create an account instead of registering as a guest every time:

- `/signup` — name, email, phone, and a password (min. 8 characters). Passwords are hashed with `scrypt`, never stored in plain text.
- `/login` — accepts either the email or the phone number, plus the password.
- `/account` — lists everything the logged-in visitor has registered for, with payment status.
- `/account/settings` — edit name, email, and phone; optionally change the password (which requires confirming the current one).
- Once logged in, `/register/<event-slug>` pre-fills name/email/phone from the account, and the resulting registration is linked to the account (`registrations.user_id`).
- Guest checkout (no account) still works exactly as before — `user_id` is simply left empty.
- The nav bar at the top of every page shows **Log in / Sign up** when signed out, or the visitor's name / **Log out** when signed in.

### Environment variables

The complete list is in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public Supabase project connection values.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used for registrations, payment updates, and the admin view.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: Razorpay credentials. The secret must remain server-only. See "Connecting your bank account (Razorpay)" below for how to get these.
- `RAZORPAY_WEBHOOK_SECRET`: the secret you set on the Razorpay webhook, used to verify that deliveries to `/api/webhooks/razorpay` really came from Razorpay. Required for paid events — see the same section below.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`: confirmation email credentials and a verified sender address.
- `ADMIN_PASSWORD`: shared password for `/admin`; use a long random value.
- `SESSION_SECRET`: signs visitor login session cookies (`/signup`, `/login`, `/account`). Use a long random value, different from `ADMIN_PASSWORD`.

### Connecting your bank account (Razorpay)

Razorpay is a payment aggregator, not a bank — payments collected through it settle into whatever bank account you link, on a rolling basis (typically T+2 to T+4 working days).

1. Create a free account at [razorpay.com](https://razorpay.com) with your business or individual details.
2. Grab the **test-mode** `Key ID` / `Key Secret` right away (Dashboard → Settings → API Keys) — no verification needed. Put these in `.env.local` to fully exercise the paid-registration flow locally with Razorpay's published test card numbers, before any real money is involved.
3. To accept real payments, complete **KYC** in the dashboard: PAN, bank account details (IFSC + account number), and basic business proof (a cancelled cheque or bank statement is usually enough for an individual/proprietorship). This typically takes 1–3 business days.
4. Once approved, switch to the **live** key pair and set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in your production environment (Vercel → Environment Variables). Never commit live keys.
5. **UPI (QR code and UPI ID) needs no extra setup** — it's already wired in. Razorpay Checkout, which this app already opens for any paid event, shows a "Pay via UPI" tab by default with a scan-and-pay QR code, UPI ID (VPA) collect, and UPI intent for mobile — this project configures Checkout to show that tab first. UPI is enabled by default on Indian Razorpay accounts.
6. Events priced at ₹0 always skip Razorpay entirely and are marked paid immediately — no keys required for free events.

**Set up the webhook before taking real money.** A paid event only becomes a registration once the payment is confirmed. The browser reports that confirmation, but if the attendee's tab closes mid-payment the money would be taken with nothing recorded. The webhook is what closes that gap, because Razorpay calls it server-to-server and retries until it succeeds:

1. Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**.
2. URL: `https://<your-domain>/api/webhooks/razorpay`
3. Active event: **`payment.captured`** (`order.paid` is also accepted).
4. Set a **secret** — any long random string you choose. This is *not* your key secret.
5. Add that same value as `RAZORPAY_WEBHOOK_SECRET` in your environment variables (locally and in Vercel).

The webhook and the browser callback both complete the same payment, and whichever arrives first creates the row — writes are keyed on the Razorpay order id, so a duplicate delivery, a retry, or a reloaded success page cannot create a second registration or send a second confirmation email.

Full technical detail (files involved, request flow, security model) is in [ARCHITECTURE_PAYMENTS.md](ARCHITECTURE_PAYMENTS.md).

### Deploy on Vercel

1. Push this repository to GitHub.
2. In Vercel, select **Add New > Project**, import the GitHub repository, and keep the detected Next.js framework and root directory.
3. Open **Project Settings > Environment Variables** and add every variable from `.env.example`.
4. Select **Production**, **Preview**, and **Development** for variables that should exist in every environment. Use separate Supabase/Razorpay credentials for Preview if desired.
5. Deploy the project. Vercel runs the Next.js build automatically; the local equivalent is `npm run build`.
6. In Supabase **Authentication > URL Configuration**, set the deployed site URL if authentication is added later. The current public event queries do not require Supabase Auth.
7. In Resend, verify the sending domain and set `RESEND_FROM_EMAIL` to an address on that domain.
8. In Razorpay, configure the production key pair only after the payment flow has been tested with test credentials.

### Connect a custom domain

1. In Vercel, open the project and choose **Settings > Domains > Add**.
2. Enter the apex domain, such as `theweekendclub.com`, and add `www.theweekendclub.com` if both should work. Choose one as the primary domain.
3. At the domain registrar, remove conflicting A, AAAA, or CNAME records for the hostnames being connected.
4. For the apex domain, add an **A** record with host `@` and value `76.76.21.21`, unless Vercel displays a different value for the project.
5. For `www`, add a **CNAME** record with host `www` and value `cname.vercel-dns.com`, unless Vercel displays a different value.
6. Leave unrelated mail records, especially MX and TXT records, unchanged.
7. Return to Vercel and wait for domain verification. DNS propagation can take from a few minutes to 48 hours.
8. Confirm both `https://theweekendclub.com` and `https://www.theweekendclub.com` load over HTTPS, then set the preferred hostname as the Vercel primary domain.
