# Plan: image URL failures + payments configuration

## 1. Broken banner images (the Magnific URL error, and workshop images)

**Root cause:** `event.banner_image_url` is passed straight into Next's `<Image>` component ([components/EventCard.tsx](components/EventCard.tsx), [app/events/[slug]/page.tsx](app/events/[slug]/page.tsx)). Next's image optimizer fetches that URL server-side and requires the response to actually be an image (`Content-Type: image/*`). The URL the user pasted —
`https://www.magnific.com/free-vector/background-with-person-running_1014946.htm#...`
— is a **webpage** (an `.htm` page showing a preview and a download button), not a direct image file, so the optimizer gets back `text/html` and throws exactly the error shown. The workshop events are broken for the same reason — whatever URL was pasted into their "Banner image URL" field is a gallery/preview page, not a raw image link.

**A direct image URL:**
- Ends in an actual image extension almost always (`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`) — or at minimum, opening the URL directly in a browser tab shows *only* the photo, full-bleed, no page chrome, no download button, no surrounding site.
- Common sources that give a clean direct link: Unsplash (open a photo, right-click the image itself → "Copy image address" — not the page URL) or Unsplash's `images.unsplash.com/photo-...` CDN links; Pexels the same way; images you host yourself (e.g., uploaded to Supabase Storage, Cloudinary, or any CDN) always give a raw file link.
- A quick way to check before pasting: open the URL in a new tab. If you see a stock-photo site's page layout (search bar, "Free Download" button, related images) around the picture, it's a page link, not an image link — go one level deeper to the actual asset.

**Fix (code):**
1. **Live preview in the event form** — [components/EventForm.tsx](components/EventForm.tsx) gets an inline `<img>` preview below the banner URL field that updates as the admin types, with an `onError` handler that shows "This doesn't look like a direct image link" inline. This catches the mistake at creation time instead of after publishing.
2. **Graceful fallback on the public pages** — [components/EventCard.tsx](components/EventCard.tsx) and [app/events/[slug]/page.tsx](app/events/[slug]/page.tsx) get an `onError` handler on the `<Image>` that swaps to a neutral placeholder graphic instead of a broken/crashed image box, so one bad URL doesn't degrade the page.
3. Fix the existing broken workshop event(s) by re-editing them in `/admin` once the preview makes it obvious which URL is bad (this is a data fix the user does via the admin UI, not a code change).

## 2. Payments configuration (Razorpay + UPI)

Full detail in [ARCHITECTURE_PAYMENTS.md](ARCHITECTURE_PAYMENTS.md). Summary of what happens in this pass:

**Already correct, no change needed:**
- Free events (price = 0) already skip Razorpay entirely and are marked paid immediately — confirmed in `app/api/create-order/route.ts`.
- Order creation and signature verification are already implemented correctly and securely.

**Configuration gap (user action, not code):**
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are empty, so any priced event 503s at checkout. The user needs to create a Razorpay account and either use test-mode keys (instant, for local testing) or complete KYC for live keys (for real money) — exact steps in the architecture doc.

**Code change in this pass:**
- `components/RegistrationForm.tsx`: configure Razorpay Checkout to show the UPI tab (QR code + UPI ID collect + intent) first, since it's already built into Checkout and just needs to be the default view rather than cards.

**Explicitly not building:** a custom UPI QR generator or a second payment gateway — Razorpay Checkout already provides UPI QR/ID natively once keys are configured.

## Execution order

1. Add image preview + validation feedback to `EventForm.tsx`.
2. Add `onError` fallback to `EventCard.tsx` and the event detail page.
3. Update `RegistrationForm.tsx` Razorpay config to lead with UPI.
4. Update `.env.example` / README with the Razorpay setup + bank-linking steps.
5. Build, then verify in-browser: create an event with a bad image URL (confirm preview catches it) and a good one (confirm it renders with fallback intact), and confirm the paid-registration flow still 503s cleanly with a clear message when keys are absent (can't fully test the live Razorpay modal without real keys, which requires user action).
