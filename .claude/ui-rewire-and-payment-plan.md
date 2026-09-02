# Weekend Run Club — UI Rewiring Plan & Payment Fix

## Part 1: Why the payment page says "not implemented yet"

Almost certainly **not a bug** — it's the Phase 3 prompt working exactly as written. That prompt ended with:

> "Do not integrate payment yet — after successful form submission, just redirect to a placeholder /success page for now."

So the agent built the registration form, saved the row to Supabase with `payment_status = "pending"`, and dropped a placeholder where checkout should be. Phase 4 (Razorpay) was never run.

**Before you can run Phase 4, you need to do these yourself — they can't be done by an agent:**

1. Create a Razorpay account at razorpay.com and complete KYC (business/individual details, PAN, bank account). Approval can take anywhere from a few hours to a few days — start this now, it's the long pole.
2. While KYC is pending, grab your **Test Mode** keys from Razorpay Dashboard → Settings → API Keys. Test mode works fully for development; you just can't accept real money yet.
3. Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in your `.env.local` (and later in Vercel's environment variables settings).

Only the `KEY_ID` is safe to expose to the browser. The `KEY_SECRET` must stay server-side only — signature verification happens in an API route, never in client code. If an agent ever puts the secret in a `NEXT_PUBLIC_*` variable, that's a real security problem; reject it.

---

## Part 2: Your real community links

Swap the placeholders for these. Keep them in one shared constants file (`lib/constants.ts`) so they're defined once and imported everywhere — you'll reference them on the homepage, the success page, and the confirmation email.

```ts
// lib/constants.ts
export const LINKS = {
  whatsapp: "https://chat.whatsapp.com/ECJOGWqQ7Gj9YwMxpwpJhF",
  strava: "https://strava.app.link/fERdAAvG65b",
  instagram: "https://instagram.com/YOUR_HANDLE", // TODO: replace
} as const;
```

Two notes: WhatsApp group invite links can be revoked/regenerated from the group admin settings, so if the group is ever reset you update one line here. And the Strava `app.link` URL is a deep link — it'll try to open the Strava app on mobile and fall back to web, which is the behavior you want for Instagram traffic.

---

## Part 3: The design system (decide this before touching any component)

The biggest reason UIs end up looking inconsistent is that colors and fonts get chosen per-component instead of once, globally. So we lock this first, then rewire screens against it.

### Color palette — "Night Run"

Recommending a dark-base palette with an electric accent. Reasoning: it reads as athletic and premium, it screenshots well into Instagram stories (light UIs wash out), and it stretches naturally to the rave/music events you're planning later — a bright, friendly light theme would feel wrong on a nightlife event page and you'd end up with two competing visual identities.

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A0A0B` | Page background |
| `surface` | `#161618` | Cards, form fields |
| `surface-hover` | `#1F1F23` | Raised/hover state |
| `border` | `#2A2A2F` | Card borders, dividers |
| `accent` | `#C6F432` | Primary CTAs, active states, badges (electric lime) |
| `accent-hover` | `#B2E01C` | Button hover/press |
| `text` | `#FAFAFA` | Primary text |
| `text-muted` | `#A1A1AA` | Secondary text, captions |
| `success` | `#22C55E` | Payment confirmed |
| `error` | `#EF4444` | Form validation, failed payment |

Electric lime on near-black is high-contrast, energetic, and distinctly *not* the default blue every SaaS template ships with. If you'd rather go warmer/more trail-running, swap `accent` to `#FF6B2C` (orange) — every other token stays identical, which is the point of doing it this way.

### Fonts

- **Headings:** `Bebas Neue` or `Anton` — condensed, bold, athletic. Loud without being cartoonish.
- **Body/UI:** `Inter` — the most legible workhorse sans at small mobile sizes.

Both load free via `next/font/google`, which self-hosts them at build time — no external request, no layout shift, no Google Fonts CDN dependency. Don't let the agent load fonts via a `<link>` tag in the head; that's the slow way.

### Shape & elevation language

- Border radius: `rounded-2xl` (16px) for cards, `rounded-full` for primary buttons and badges. Consistency here does most of the "looks clean and designed" work.
- No heavy drop shadows on a dark theme — they're invisible. Use a subtle 1px `border` color instead to separate surfaces.
- Buttons: solid `accent` background with near-black text for primary; transparent with a border for secondary.

---

## Part 4: Rewiring order (one screen at a time)

Do these **in this exact order**. The reason: the design tokens must land before any component is restyled, and the shared components (Button, Card) must land before the screens that use them — otherwise you restyle the same card three times.

| Step | What | Why it's in this position |
|---|---|---|
| **A** | Design tokens + fonts in `tailwind.config.ts` and `globals.css` | Everything downstream references these. Do it first or you'll redo it. |
| **B** | Shared primitives: `Button`, `Card`, `Badge`, `Input` components | Built once, reused on every screen. Skipping this is why UIs drift. |
| **C** | Homepage rewire (hero, about, community links, events preview) | Highest-traffic screen — this is what Instagram visitors judge you on. |
| **D** | Events list + event detail pages | Reuses `EventCard` from step B/C, so it's mostly composition. |
| **E** | Registration form | Needs the `Input` primitive from B; restyle before wiring payment into it. |
| **F** | **Razorpay payment integration** (the actual gap) | Do this *after* the form is styled, so you're not debugging payment and CSS at once. |
| **G** | Success page + confirmation email | Depends on payment working to test properly. |
| **H** | Admin page | Internal tool, lowest priority, minimal styling needed. |

Commit to git after each step. If a step breaks something, you can revert one step instead of untangling everything.

---

## Part 5: Copy-paste prompts

### Step A — Design tokens & fonts

```
Set up the global design system for this Next.js + Tailwind running club site. Do not restyle
any existing components yet — this step only establishes the foundation.

1. In tailwind.config.ts, extend the theme with these semantic color tokens (do NOT use raw
   hex values anywhere else in the codebase after this):
   bg: #0A0A0B, surface: #161618, surface-hover: #1F1F23, border: #2A2A2F,
   accent: #C6F432, accent-hover: #B2E01C, text: #FAFAFA, text-muted: #A1A1AA,
   success: #22C55E, error: #EF4444

2. Load fonts using next/font/google (self-hosted at build time, NOT via a <link> tag):
   - "Bebas Neue" as the display/heading font, exposed as CSS variable --font-display
   - "Inter" as the body font, exposed as CSS variable --font-body
   Wire both into tailwind.config.ts as fontFamily.display and fontFamily.body, and apply
   the font variables on the <body> in app/layout.tsx.

3. In globals.css set the page background to `bg`, default text color to `text`, and enable
   antialiasing. Ensure the dark background applies to the full viewport height with no white
   flash on load.

4. Create lib/constants.ts exporting a LINKS object with these exact values:
   whatsapp: "https://chat.whatsapp.com/ECJOGWqQ7Gj9YwMxpwpJhF"
   strava: "https://strava.app.link/fERdAAvG65b"
   instagram: "https://instagram.com/YOUR_HANDLE"  // leave as TODO placeholder

Verify the build passes and the site renders on a dark background with the new fonts before
finishing.
```

### Step B — Shared UI primitives

```
Create reusable UI primitives in /components/ui/ using the design tokens from tailwind.config.ts.
Use only semantic token names (bg, surface, accent, etc.) — no raw hex values.

1. Button.tsx — variants: "primary" (solid accent bg, near-black text), "secondary"
   (transparent bg, border, text color), "ghost" (no bg or border). Sizes: "sm", "md", "lg".
   All variants: rounded-full, minimum height 44px for md/lg (touch target requirement),
   font-body semibold, smooth color transition, visible focus ring for accessibility,
   and a disabled state (reduced opacity, cursor-not-allowed). Support an optional
   `isLoading` prop showing a spinner and disabling the button.

2. Card.tsx — surface background, 1px border in `border` color, rounded-2xl, generous padding.
   Accept an optional `interactive` prop that adds a subtle hover/press state (only when true).

3. Badge.tsx — small rounded-full pill for event types. Variants keyed to event_type:
   "run", "workshop", "music" — each visually distinct but all within the palette (e.g. accent
   for run, muted surface for workshop, a tinted variant for music). Uppercase, small tracking.

4. Input.tsx — form input with a label, surface background, border, rounded-xl, minimum 44px
   height, focus state using accent color, and an error state that shows a message in the
   `error` color below the field. Must accept a ref (use forwardRef) so it works with
   React Hook Form.

Keep every component fully typed with TypeScript. Do not add a component library dependency —
these should be plain Tailwind + React.
```

### Step C — Homepage rewire

```
Rewire the homepage (/app/page.tsx) to use the new design system. Replace all existing styling
with the design tokens and the primitives from /components/ui/. Do not change the data shape or
add new features — this is a visual rewire.

- Hero carousel: full-bleed on mobile, taller aspect ratio on mobile (roughly 4:5) than desktop
  (16:9). Heading in the display font, large and uppercase. Dark gradient overlay from the
  bottom so text stays readable over any photo. CTA uses the primary Button. Carousel dots use
  the accent color for the active slide, muted for inactive, each with a 44px tap target even
  if the visible dot is small.

- About section: display-font heading, body-font paragraph in text-muted, and a row of 3 stat
  blocks (number in display font + accent color, label in small muted text). Stack the stats
  in a row of 3 even on mobile — they're short enough.

- Community links: three Cards using the `interactive` variant, each with an icon
  (lucide-react), a title, and a one-line description. Import URLs from lib/constants.ts
  (LINKS.whatsapp, LINKS.strava, LINKS.instagram) — do not hardcode them. Each opens in a new
  tab with rel="noopener noreferrer". Stacked vertically on mobile, 3-across at md:.

- Upcoming Events: section heading + "View All" ghost Button. Three EventCards using the shared
  Card and Badge primitives — image at top (rounded to match card radius), event_type Badge
  overlaid on or below the image, title in display font, date formatted as "Sat, 14 Sep",
  one-line description with line-clamp-2, and price shown as "Free" when price is 0.

Verify at 375px width: no horizontal overflow, no cramped spacing, all tap targets >= 44px.
```

### Step F — Razorpay payment (the actual gap)

```
Implement the Razorpay payment flow, replacing the "not implemented yet" placeholder in the
registration flow. Currently the form creates a `registrations` row with
payment_status = "pending" and redirects straight to /success — that redirect must now only
happen after a verified payment.

Server-side:
1. Create /app/api/create-order/route.ts. It accepts a registrationId, looks up the associated
   event in Supabase, and creates a Razorpay order for that event's price (converted to paise —
   Razorpay uses the smallest currency unit, so multiply rupees by 100). CRITICAL: read the
   price from the database, never from the client request body — otherwise a user can tamper
   with the amount. Return the order id and amount.

2. Create /app/api/verify-payment/route.ts. It receives razorpay_order_id, razorpay_payment_id,
   and razorpay_signature. Verify the signature server-side using HMAC SHA256 with
   RAZORPAY_KEY_SECRET. Only if the signature is valid, update the registration row:
   payment_status = "paid" and store payment_id. If invalid, return an error and leave the row
   as "pending" — never trust the client's word that payment succeeded.

Client-side:
3. After the registration row is created, call /api/create-order, then load the Razorpay
   Checkout script and open the checkout modal with the returned order. Prefill the user's
   name, email, and phone from the form. On the success handler, POST the response to
   /api/verify-payment and only redirect to /success once it confirms "paid".

4. Handle these states explicitly in the UI: payment modal dismissed by user (show a "Complete
   your payment" retry button, don't lose their form data), payment failed (set payment_status
   to "failed", show the error in the `error` color with a retry option), and verification
   failed (show a message telling them to contact support with their registration id — do not
   silently pass them through).

5. Free events (price = 0) must skip Razorpay entirely — mark payment_status as "paid"
   immediately and go straight to /success.

Environment: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET. The secret must ONLY be used in API
routes — never in client components, never in a NEXT_PUBLIC_ variable. Add both to
.env.example. Style all payment UI using the existing design tokens and Button primitive.
```

---

## Part 6: Testing the payment flow before going live

Razorpay test mode gives you sandbox payment methods — use their documented test card numbers and test UPI IDs from the Razorpay docs (they're listed in the dashboard under test mode). Run through each of these before you switch to live keys:

- Successful payment → row shows `paid`, success page renders, email arrives
- User closes the checkout modal → row stays `pending`, retry button appears, form data intact
- Failed payment → row shows `failed`, error message renders clearly
- Free event (price 0) → skips Razorpay entirely, goes straight to success
- Reload the success page → doesn't create a duplicate registration or re-charge

That last one catches a genuinely common bug worth checking deliberately.
