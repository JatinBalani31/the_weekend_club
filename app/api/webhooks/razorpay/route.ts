import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { completePaidRegistration } from "@/lib/completeRegistration";

/**
 * Razorpay webhook.
 *
 * This is the safety net for the registration flow: the browser callback in
 * /api/verify-payment only runs if the attendee's tab survives the payment, so
 * without this a completed payment could leave no registration behind. Razorpay
 * delivers here server-to-server and retries on failure, independent of the
 * browser.
 *
 * Configure at Razorpay Dashboard > Settings > Webhooks:
 *   URL:     https://<your-domain>/api/webhooks/razorpay
 *   Events:  payment.captured  (order.paid also works)
 *   Secret:  must match RAZORPAY_WEBHOOK_SECRET
 */

// Signatures are over the exact bytes Razorpay sent, so the body must not be
// re-serialised before checking - always read it as raw text first.
function isValidWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

type WebhookBody = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    order?: { entity?: { id?: string } };
  };
};

const HANDLED_EVENTS = new Set(["payment.captured", "order.paid"]);

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set; rejecting webhook delivery");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const rawBody = await request.text();

  if (!signature || !isValidWebhookSignature(rawBody, signature, secret)) {
    console.error("Rejected a webhook delivery with an invalid signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Anything we do not handle is acknowledged, not retried.
  if (!body.event || !HANDLED_EVENTS.has(body.event)) {
    return NextResponse.json({ ignored: true, event: body.event ?? null });
  }

  const payment = body.payload?.payment?.entity;
  const orderId = payment?.order_id ?? body.payload?.order?.entity?.id ?? "";
  const paymentId = payment?.id ?? "";

  if (!orderId || !paymentId) {
    console.error("Webhook delivery had no order/payment id", body.event);
    return NextResponse.json({ ignored: true, reason: "missing ids" });
  }

  const { registrationId, created, error, status } = await completePaidRegistration(orderId, paymentId);

  if (error || !registrationId) {
    // 4xx means the delivery can never succeed (an order we cannot match), so
    // acknowledge it rather than making Razorpay retry a permanent failure.
    // 5xx is transient, so return an error and let Razorpay try again.
    const permanent = (status ?? 500) < 500;
    console.error("Webhook could not complete registration", orderId, status, error);
    return NextResponse.json({ error, orderId }, { status: permanent ? 200 : 500 });
  }

  return NextResponse.json({ registrationId, created: created ?? false });
}
