import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { completePaidRegistration } from "@/lib/completeRegistration";

type PaymentPayload = {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
};

function isValidSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

/**
 * Browser-side confirmation, called from the Razorpay checkout handler so the
 * attendee sees their pass immediately. The webhook covers the case where this
 * never runs because the browser was closed mid-payment.
 */
export async function POST(request: Request) {
  let payload: PaymentPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderId = typeof payload.razorpay_order_id === "string" ? payload.razorpay_order_id : "";
  const paymentId = typeof payload.razorpay_payment_id === "string" ? payload.razorpay_payment_id : "";
  const signature = typeof payload.razorpay_signature === "string" ? payload.razorpay_signature : "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!orderId || !paymentId || !signature || !keySecret || !isValidSignature(orderId, paymentId, signature, keySecret)) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const { registrationId, error, status } = await completePaidRegistration(orderId, paymentId);
  if (error || !registrationId) return NextResponse.json({ error }, { status: status ?? 500 });

  return NextResponse.json({ verified: true, registrationId });
}
