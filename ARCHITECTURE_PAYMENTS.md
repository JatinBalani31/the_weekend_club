# Payments architecture

## Current state (as of this document)

The codebase already has a working Razorpay integration wired end-to-end:

```
RegistrationForm.tsx  →  POST /api/registrations   (creates a "pending" row)
                      →  POST /api/create-order     (creates a Razorpay order, or
                                                       marks paid immediately if price = 0)
                      →  Razorpay Checkout modal opens in-browser
                      →  POST /api/verify-payment   (verifies the signature server-side,
                                                       marks the row "paid", sends email)
```

Files involved:
- [components/RegistrationForm.tsx](components/RegistrationForm.tsx) — loads `checkout.js`, opens the Razorpay modal.
- [app/api/create-order/route.ts](app/api/create-order/route.ts) — creates the order via Razorpay's REST API using `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. Free events (`price <= 0`) are marked paid here and never touch Razorpay.
- [app/api/verify-payment/route.ts](app/api/verify-payment/route.ts) — HMAC-verifies `razorpay_signature` server-side before marking a registration paid. This is the step that actually matters for security — the client can't fake a "paid" status.

**What was missing:** `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` were never set, so `/api/create-order` returns 503 ("Payment is not configured yet") for any event priced above ₹0. That's the "we have not configured the payments page" gap — the code path exists, the credentials don't.

## How money actually reaches your bank account

Razorpay is a **payment aggregator**, not a bank. The flow is:

1. **You create a Razorpay account** at [razorpay.com](https://razorpay.com) using your business (or individual/proprietorship) details.
2. **KYC**: Razorpay asks for PAN, bank account (IFSC + account number), and business proof (GST optional for individuals/proprietorships under certain volume, but expect to provide at least PAN + a cancelled cheque or bank statement). This is a one-time verification that typically takes 1–3 business days.
3. Once approved, Razorpay gives you a **live** `Key ID` and `Key Secret` (Dashboard → Settings → API Keys). There's also a **test mode** key pair you can use immediately, before KYC finishes, with fake card numbers — good for verifying the integration works before real money is involved.
4. Payments collected through Checkout settle to your linked bank account on a rolling basis (default T+2 to T+4 working days, configurable/faster on some plans).
5. Put the live keys in your production environment's env vars (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) — never commit them. Use the test keys in `.env.local` for local dev.

**This account creation and KYC step has to happen in Razorpay's own dashboard — it's not something that can be done from this codebase.** Once you have either test or live keys, drop them into `.env.local` / production env vars and paid events start working immediately with zero code changes.

## UPI: QR code and UPI ID

Good news — **this already works with the existing integration, no extra code required.** Razorpay Checkout (the modal `RegistrationForm.tsx` already opens) natively includes, for any Indian customer:
- **UPI ID / VPA collect** — customer types their UPI ID (`name@bank`), approves the request in their UPI app.
- **Scan-and-pay QR code** — Checkout generates a live UPI QR code the customer scans with any UPI app (GPay, PhonePe, Paytm, etc.).
- **UPI intent** — on mobile, Checkout can deep-link directly into an installed UPI app.

These appear automatically as payment method tabs inside the modal once your Razorpay account has UPI enabled (it's on by default for Indian accounts). As a corrective change, this plan makes UPI the **first/default tab** in the checkout modal (via Razorpay's `config.display` option) since it's the payment method most relevant to this audience, rather than leaving the default (card-first) ordering.

No separate "Pay via UPI" button or custom QR generation needs to be built — building a custom UPI QR flow would mean handling settlement reconciliation ourselves, which Razorpay already does correctly.

## Corrective code changes in this pass

1. **`components/RegistrationForm.tsx`** — add `config.display.blocks` / `sequence` to the Razorpay options so the UPI block (intent + QR + collect) renders first, ahead of cards/netbanking.
2. **`.env.example`** and **README.md** — clarify that Razorpay test-mode keys are enough to fully exercise the paid flow locally (no live KYC required to test), and document the bank-account-linking steps above.
3. No changes needed to `create-order` / `verify-payment` — the order-creation and signature-verification logic is already correct and secure as-is.

## Non-goals (explicitly out of scope for this pass)

- Building a custom UPI QR/collect flow outside Razorpay Checkout (unnecessary — Razorpay already provides this, and rolling our own would mean handling settlement/webhooks ourselves).
- Supporting a second payment gateway (Stripe, Cashfree, etc.) — not requested.
- Handling refunds/payouts UI — not requested; can be done manually from the Razorpay dashboard for now.
