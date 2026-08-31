import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getRegistrationById } from "@/lib/registrations";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { COMMUNITY_LINKS } from "@/lib/site";

type PaymentPayload = { registrationId?: unknown; razorpay_order_id?: unknown; razorpay_payment_id?: unknown; razorpay_signature?: unknown };

function isValidSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(request: Request) {
  let payload: PaymentPayload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const registrationId = typeof payload.registrationId === "string" ? payload.registrationId : "";
  const orderId = typeof payload.razorpay_order_id === "string" ? payload.razorpay_order_id : "";
  const paymentId = typeof payload.razorpay_payment_id === "string" ? payload.razorpay_payment_id : "";
  const signature = typeof payload.razorpay_signature === "string" ? payload.razorpay_signature : "";
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!registrationId || !orderId || !paymentId || !signature || !secret || !isValidSignature(orderId, paymentId, signature, secret)) return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Payment verification is not configured yet." }, { status: 503 });
  const registration = await getRegistrationById(registrationId);
  if (!registration || !registration.event) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  if (registration.razorpay_order_id !== orderId) return NextResponse.json({ error: "Payment order does not match registration." }, { status: 400 });

  if (registration.payment_status !== "paid") {
    const { error } = await supabase.from("registrations").update({ payment_status: "paid", payment_id: paymentId }).eq("id", registrationId);
    if (error) { console.error("Unable to update payment status", error); return NextResponse.json({ error: "Could not confirm payment." }, { status: 500 }); }
  }

  let emailSent = false;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (resendApiKey && fromEmail) {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({ from: fromEmail, to: registration.email, subject: `You're in: ${registration.event.title}`, text: `Hi ${registration.name},\n\nYour payment is confirmed for ${registration.event.title}.\nDate: ${new Date(registration.event.date).toLocaleString("en-IN")}\nLocation: ${registration.event.location}\n\nJoin the WhatsApp community: ${COMMUNITY_LINKS.whatsapp}\n\nSee you outside!\nthe Weekend Club` });
    emailSent = !error;
    if (error) console.error("Unable to send confirmation email", error);
  }
  return NextResponse.json({ verified: true, emailSent });
}