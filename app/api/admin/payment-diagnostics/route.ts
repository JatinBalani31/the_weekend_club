import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin";
import { fromOrderNotes } from "@/lib/registrationInput";
import { resolveEventForRegistration } from "@/lib/createRegistration";
import { getSupabaseAdminClient } from "@/lib/supabase";

/**
 * Support tool: explains exactly what the payment pipeline sees for one
 * payment, so "I paid but got an error" can be diagnosed without guessing.
 *
 * Admin-only, and deliberately reports derived facts rather than any secret -
 * key lengths and prefixes, never the values themselves.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const paymentId = url.searchParams.get("payment_id") ?? "";
  if (!paymentId) return NextResponse.json({ error: "payment_id is required." }, { status: 400 });

  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";

  const report: Record<string, unknown> = {
    credentials: {
      keyIdPrefix: keyId.slice(0, 8),
      keyIdLength: keyId.length,
      mode: keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : "unknown",
      secretLength: keySecret.length,
      // A stray newline or space survives Basic auth but breaks HMAC, so it is
      // worth knowing whether the stored value has been trimmed.
      secretHasWhitespace: keySecret !== keySecret.trim(),
      webhookSecretLength: (process.env.RAZORPAY_WEBHOOK_SECRET ?? "").length,
    },
  };

  if (!keyId || !keySecret) {
    report.fatal = "Razorpay credentials are not configured.";
    return NextResponse.json(report, { status: 200 });
  }

  const authorization = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authorization },
  });

  if (!paymentResponse.ok) {
    report.payment = { httpStatus: paymentResponse.status, body: (await paymentResponse.text()).slice(0, 300) };
    return NextResponse.json(report, { status: 200 });
  }

  const payment = (await paymentResponse.json()) as Record<string, unknown>;
  const orderId = typeof payment.order_id === "string" ? payment.order_id : null;

  report.payment = {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
    orderId,
    captured: payment.captured,
    // Would the current code accept this payment?
    passesStatusCheck: payment.status === "captured" || payment.status === "authorized",
  };

  if (!orderId) {
    report.conclusion = "Payment has no order_id - it was not created against an order.";
    return NextResponse.json(report, { status: 200 });
  }

  // The signature the client should have sent for this pair, so a mismatch
  // between what was sent and what we expect becomes visible.
  report.expectedSignature = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");

  const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: authorization },
  });

  if (!orderResponse.ok) {
    report.order = { httpStatus: orderResponse.status, body: (await orderResponse.text()).slice(0, 300) };
    return NextResponse.json(report, { status: 200 });
  }

  const order = (await orderResponse.json()) as Record<string, unknown>;
  report.order = {
    id: order.id,
    status: order.status,
    amount: order.amount,
    amountPaid: order.amount_paid,
    noteKeys: Object.keys((order.notes as Record<string, unknown>) ?? {}),
    amountMatchesPayment: payment.amount === order.amount,
  };

  const parsed = fromOrderNotes(order.notes as Record<string, unknown>);
  report.notes = parsed.error ? { error: parsed.error } : { ok: true, eventSlug: parsed.input?.eventSlug, email: parsed.input?.email };

  if (parsed.input) {
    const resolved = await resolveEventForRegistration(parsed.input);
    report.eventResolution = resolved.error ? { error: resolved.error, status: resolved.status } : { ok: true, title: resolved.resolved?.event.title, amount: resolved.resolved?.amount };
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data } = await supabase.from("registrations").select("id, registration_code, email").eq("razorpay_order_id", orderId).maybeSingle();
    report.existingRegistration = data ?? null;
  }

  return NextResponse.json(report, { status: 200 });
}
