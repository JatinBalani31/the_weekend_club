# The Weekend Club

The Weekend Club is a mobile-first event and registration platform for runs, workshops, and music events. Visitors can browse upcoming events, register as guests or signed-in users, pay with Razorpay, receive a confirmation pass, and join the club community. Admins manage events, registrations, hero slides, and venue check-in from the same application.

## Infrastructure at a glance

```text
Browser
  |
  v
Next.js 14 App Router on Vercel
  |-- Server-rendered pages and client components
  |-- API route handlers
  |-- Signed cookies and server-only business logic
  |
  |-- Supabase PostgreSQL
  |     Events, tiers, registrations, users, admin settings, rate limits
  |
  |-- Razorpay
  |     Checkout, payment verification, captured-payment webhook
  |
  |-- Resend
        Registration and pre-event notification email
```

The application is a single Next.js deployment. There is no separate Express server or worker service. Vercel runs the web application and scheduled cron request; Supabase provides the persistent database; Razorpay handles payment collection; and Resend handles email delivery.

## Technology stack

- **Next.js 14** with the App Router and TypeScript
- **React 18** for interactive forms, dashboards, carousels, and checkout UI
- **Tailwind CSS** for styling
- **Supabase PostgreSQL** accessed through `@supabase/supabase-js`
- **Razorpay Checkout** for Indian card, UPI, and netbanking payments
- **Resend** for transactional email
- **Vercel** for production hosting and cron execution
- **Vitest** for unit and integration tests
- **SheetJS (`xlsx`)** for admin registration exports

## Source layout

| Path | Responsibility |
| --- | --- |
| `app/` | Pages, layouts, and API route handlers |
| `components/` | Client and server UI components |
| `components/ui/` | Shared buttons, cards, badges, and inputs |
| `lib/events.ts` | Event and ticket-tier queries and mutations |
| `lib/registrations.ts` | Registration lookups and admin views |
| `lib/createRegistration.ts` | Payment-backed registration persistence |
| `lib/completeRegistration.ts` | Shared paid-registration completion and email path |
| `lib/supabase.ts` | Public and server-only Supabase clients |
| `lib/users.ts` | Visitor account operations |
| `lib/userAuth.ts` | Password hashing and signed visitor sessions |
| `lib/admin.ts` | Admin sessions, revocation, and TOTP helpers |
| `lib/devStore.ts` | Local JSON persistence when Supabase is not configured |
| `supabase/migrations/` | Ordered PostgreSQL schema migrations |
| `tests/unit/` | Pure logic and security contract tests |
| `tests/integration/` | HTTP and database-backed application tests |
| `content/en.json` | User-facing copy and labels |

## Public pages

- `/` - Homepage with hero carousel, club information, community links, and upcoming events
- `/events` - Active future events
- `/events/[slug]` - Event details, ticket tiers, capacity, and registration entry point
- `/register/[slug]` - Registration form and payment checkout
- `/success` - Payment status, registration code/pass, calendar download, and community links
- `/signup` - Optional visitor account creation
- `/login` - Password or Google sign-in
- `/account` - Signed-in visitor registrations and passes
- `/account/settings` - Profile and password management

Public event queries only expose active events whose date is in the future. Unknown, inactive, or past event slugs return 404.

## Admin application

`/admin` is protected by a shared password stored in `ADMIN_PASSWORD`. A successful login receives an expiring, signed `httpOnly` cookie called `admin_session`. Admin sessions can also be revoked globally through the `admin_settings.sessions_valid_from` timestamp.

The dashboard provides:

- Registration summaries and Excel export
- Event creation, editing, activation/deactivation, deletion, and ticket-tier management
- Hero carousel editing
- Registration lookup and venue check-in at `/admin/checkin`
- Payment diagnostics for investigating Razorpay completion issues

Events with registrations cannot be casually deleted; deactivation preserves historical registration data. Visitor accounts use a separate signed `user_session` cookie and do not share admin authorization.

Two-factor authentication helpers and database fields exist in `lib/admin.ts` and `admin_settings`, but password-only admin login is currently wired into the application.

## Registration and payment flow

### Free events

1. The browser submits the event slug and attendee details to `POST /api/registrations`.
2. The server validates the payload again, resolves the event from the database, checks capacity, and creates a paid registration immediately.
3. The browser receives the registration id and opens the success page.

### Paid events

1. `POST /api/registrations` validates the attendee input and resolves the event and selected tier server-side.
2. The amount is calculated from the database in paise. Client-supplied `amount`, `price`, and `charged_price` values are ignored.
3. The server creates a Razorpay order. Attendee details are carried in the order notes; no registration row is created yet.
4. `RegistrationForm` loads Razorpay Checkout in the browser and opens it with the server-created `order_id`.
5. After checkout, the browser sends the payment ids and signature to `POST /api/verify-payment`.
6. The server verifies the HMAC-SHA256 signature with `RAZORPAY_KEY_SECRET`, confirms the payment belongs to the order, and checks the paid amount.
7. Razorpay independently sends `payment.captured` or `order.paid` to `POST /api/webhooks/razorpay`.
8. Both completion paths call `completePaidRegistration`. The Razorpay order id is the idempotency key, so a browser callback, webhook retry, or duplicate callback cannot create a second registration or send a second email.
9. The confirmation email is sent through Resend only by the request that actually creates the registration.

The webhook is required in production because the attendee can close their browser after payment. The webhook verifies the raw request body with `RAZORPAY_WEBHOOK_SECRET`, allowing payment completion even when the browser callback never arrives.

If an event becomes full between payment and persistence, the completion path attempts a Razorpay refund. Transient persistence errors remain retryable so the webhook can try again.

## Database architecture

Supabase migrations are applied in filename order:

1. `events` and `registrations`
2. Razorpay order references
3. Ticket tiers and historical charged price
4. Admin settings
5. Visitor users and registration ownership
6. Registration codes
7. Revocable sessions, rate limiting, and capacity enforcement
8. Registration deduplication by event and email
9. Hero slides
10. Check-in and pre-event notification fields
11. Google OAuth identity support

The main tables are:

- `events`: title, slug, description, image, date, location, price, capacity, type, and active state
- `ticket_tiers`: event-specific price, capacity, sale deadline, and active state
- `registrations`: attendee details, event/tier, payment state, Razorpay ids, charged price, registration code, ownership, email opt-in, and check-in timestamp
- `users`: optional visitor accounts with scrypt password hashes or Google identity
- `admin_settings`: hero slides, staged TOTP configuration, and admin session revocation timestamp
- `rate_limits`: database-backed request counters shared across serverless instances

Row-level security is enabled on exposed tables. Anonymous and authenticated clients can read only active future events and active future ticket tiers. Registrations, users, admin settings, and rate limits have no public policies and are accessed through the server-only service-role client.

The capacity trigger locks the event row and counts only paid registrations, preventing concurrent requests from exceeding event or tier capacity. Rate limiting uses a PostgreSQL function and row lock so limits work across multiple Vercel instances.

## Supabase clients and security boundaries

`lib/supabase.ts` exposes two factories:

- `getSupabaseClient()` uses the public URL and anon key. It is suitable for public, RLS-protected access.
- `getSupabaseAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY`. It is server-only, bypasses RLS, and is used for private operations such as registrations, accounts, admin queries, and payment completion.

Never put the service-role key, Razorpay secret, Resend key, admin password, session secret, or webhook secret in a `NEXT_PUBLIC_` variable or client component.

## Local development fallback

When `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, the application uses `.data/dev-db.json` through `lib/devStore.ts`. This allows local event, registration, account, and admin-flow testing without a Supabase project. The `.data` directory is local and gitignored. Delete it to reset the local data.

Free events work without Razorpay credentials. Paid events require Razorpay test-mode credentials. Test keys can exercise Checkout without accepting real money or completing live KYC.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values appropriate to the environment:

| Variable | Used for | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Browser-safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public RLS client | Browser-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | Private database operations | Server-only |
| `RAZORPAY_KEY_ID` | Checkout key and order creation | Public key may reach browser |
| `RAZORPAY_KEY_SECRET` | Payment signature/API verification | Server-only |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification | Server-only |
| `RESEND_API_KEY` | Confirmation and notification email | Server-only |
| `RESEND_FROM_EMAIL` | Verified email sender | Server-only/configuration |
| `ADMIN_EMAIL` | Pre-event participant-list recipient | Server-only |
| `ADMIN_PASSWORD` | Shared admin login | Server-only |
| `SESSION_SECRET` | Visitor session signing | Server-only |
| `GOOGLE_CLIENT_ID` | Google OAuth client id | Server configuration |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Server-only |
| `CRON_SECRET` | Vercel cron authorization | Server-only |

Do not commit `.env.local`. Any credentials exposed in chat, logs, screenshots, or source control should be rotated immediately.

## Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Apply all files in `supabase/migrations/` to the target Supabase project in timestamp order. Then open `http://localhost:3000`.

Useful commands:

```bash
npm run dev                # Development server
npm run build              # Production build and TypeScript validation
npm run start:prod        # Build and run the production server locally
npm run test               # All Vitest tests
npm run test:unit         # Unit tests
npm run test:integration  # HTTP/database integration tests
```

## External service setup

### Razorpay

Use test-mode keys during development. For production, complete Razorpay KYC and configure the live keys in Vercel. Add a Razorpay webhook for:

```text
https://YOUR-DOMAIN/api/webhooks/razorpay
```

Enable `payment.captured` or `order.paid`, choose a long random webhook secret, and copy that same value to `RAZORPAY_WEBHOOK_SECRET`. Razorpay Checkout provides UPI intent, UPI ID collection, and QR payment without a custom QR implementation.

### Google OAuth

Configure the Google OAuth redirect URI as:

```text
https://YOUR-DOMAIN/api/auth/google/callback
```

The callback creates or finds a visitor account. Users who do not have a phone number complete the remaining profile step before using account-linked registration.

### Resend

Verify the sending domain in Resend and set `RESEND_FROM_EMAIL` to an address on that domain. Email failure is logged but does not undo a successful payment or registration.

## Cron notifications

`GET /api/cron/pre-event-notify` sends the admin a participant list shortly before an event. Vercel supplies the scheduled request; the route must be protected with `CRON_SECRET`. `events.notified_at` makes the notification idempotent.

## Deployment

1. Import the repository into Vercel with the Next.js root directory.
2. Add environment variables for Development, Preview, and Production as appropriate.
3. Apply the Supabase migrations to the production project.
4. Use test Supabase and Razorpay credentials in Preview where possible.
5. Verify the production Razorpay webhook URL and Resend sender domain.
6. Deploy and smoke-test the homepage, event pages, free registration, paid checkout, webhook, email, account, admin, and check-in flows.
7. Add the custom domain in Vercel and use the DNS records Vercel displays. Preserve unrelated MX and TXT records.

## Testing

The test suite covers:

- Event visibility and IST date rendering
- Input validation and normalization
- Free and paid registration behavior
- Server-derived payment amounts and capacity enforcement
- Razorpay signature and webhook verification
- Idempotent payment completion and retry classification
- Admin authentication and protected APIs
- Visitor authentication and profile behavior

Integration tests require the configured test database and application server described in `tests/integration/helpers.ts`. Run the focused unit suite first when changing validation, authentication, or payment logic.

## Further technical detail

- [ARCHITECTURE_PAYMENTS.md](ARCHITECTURE_PAYMENTS.md) explains the payment completion and webhook design.
- [supabase/migrations](supabase/migrations) is the source of truth for the PostgreSQL schema changes.
- [tests](tests) documents the security and behavioral contracts enforced by automated tests.
