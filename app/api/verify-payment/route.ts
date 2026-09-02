import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { COMMUNITY_LINKS } from "@/lib/site";
import { fromOrderNotes } from "@/lib/registrationInput";
import { persistRegistration, resolveEventForRegistration } from "@/lib/createRegistration";

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
 * Confirms a payment and only then writes the registration.
 *
 * The submitted details are read back from the Razorpay order rather than from
 * this request, so the client cannot alter who or what it registers after the
 * amount has been charged.
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
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!orderId || !paymentId || !signature || !keyId || !keySecret || !isValidSignature(orderId, paymentId, signature, keySecret)) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  // Fetch the order server-side: its notes are the authoritative copy of what
  // was submitted, and its status confirms the payment actually landed.
  const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
  });

  if (!orderResponse.ok) {
    console.error("Unable to load Razorpay order", orderResponse.status);
    return NextResponse.json({ error: "Could not confirm payment." }, { status: 502 });
  }

  const order = (await orderResponse.json()) as { status?: string; amount_paid?: number; notes?: Record<string, unknown> };
  if (order.status !== "paid" && !order.amount_paid) {
    return NextResponse.json({ error: "This payment has not completed." }, { status: 400 });
  }

  const { input, userId, error: notesError } = fromOrderNotes(order.notes);
  if (notesError || !input) return NextResponse.json({ error: notesError ?? "Could not confirm payment." }, { status: 400 });

  const { resolved, error: resolveError } = await resolveEventForRegistration(input);
  if (resolveError || !resolved) {
    // Payment succeeded but the event is gone or full: do not silently drop it.
    console.error("Paid order could not be matched to an available event", orderId, resolveError);
    return NextResponse.json({ error: "Your payment went through but the event is no longer available. Please contact us and quote your payment id." }, { status: 409 });
  }

  const { registrationId, error } = await persistRegistration({
    input,
    resolved,
    userId: userId ?? null,
    paymentStatus: "paid",
    razorpayOrderId: orderId,
    paymentId,
  });

  if (error || !registrationId) {
    console.error("Unable to save registration after payment", orderId, error);
    return NextResponse.json({ error: "Your payment went through but we could not save your registration. Please contact us and quote your payment id." }, { status: 500 });
  }

  let emailSent = false;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (resendApiKey && fromEmail) {
    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: input.email,
      subject: `You're in: ${resolved.event.title}`,
      text: `Hi ${input.name},\n\nYour payment is confirmed for ${resolved.event.title}.\nDate: ${new Date(resolved.event.date).toLocaleString("en-IN")}\nLocation: ${resolved.event.location}\n\nJoin the WhatsApp community: ${COMMUNITY_LINKS.whatsapp}\n\nSee you outside!\nthe Weekend Club`,
    });
    emailSent = !emailError;
    if (emailError) console.error("Unable to send confirmation email", emailError);
  }

  return NextResponse.json({ verified: true, registrationId, emailSent });
}
