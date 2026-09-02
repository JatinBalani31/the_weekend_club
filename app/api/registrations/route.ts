import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserCookieName, getUserIdFromSessionToken } from "@/lib/userAuth";
import { parseRegistrationInput, toOrderNotes } from "@/lib/registrationInput";
import { persistRegistration, resolveEventForRegistration } from "@/lib/createRegistration";

/**
 * Starts a registration.
 *
 * Free events are saved straight away. Paid events are NOT written to the
 * database here - the submission is carried in the Razorpay order's notes and
 * only becomes a row once /api/verify-payment confirms the payment, so an
 * abandoned checkout leaves nothing behind.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { input, error: parseError } = parseRegistrationInput(payload);
  if (parseError || !input) return NextResponse.json({ error: parseError }, { status: 400 });

  const { resolved, error: resolveError, status } = await resolveEventForRegistration(input);
  if (resolveError || !resolved) return NextResponse.json({ error: resolveError }, { status: status ?? 400 });

  const userId = getUserIdFromSessionToken(cookies().get(getUserCookieName())?.value);

  // Free event: nothing to pay, so the spot is secured immediately.
  if (resolved.amount <= 0) {
    const { registrationId, error } = await persistRegistration({ input, resolved, userId, paymentStatus: "paid" });
    if (error || !registrationId) return NextResponse.json({ error: error ?? "Could not save your registration." }, { status: 500 });
    return NextResponse.json({ free: true, registrationId }, { status: 201 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: "Payment is not configured yet." }, { status: 503 });

  const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(resolved.amount * 100), // Razorpay works in paise.
      currency: "INR",
      receipt: `evt_${resolved.event.id.slice(0, 30)}`,
      notes: toOrderNotes(input, userId),
    }),
  });

  if (!orderResponse.ok) {
    console.error("Unable to create Razorpay order", orderResponse.status, await orderResponse.text());
    return NextResponse.json({ error: "Could not start payment." }, { status: 502 });
  }

  const order = (await orderResponse.json()) as { id?: string; amount?: number; currency?: string };
  if (!order.id) return NextResponse.json({ error: "Payment provider returned an invalid order." }, { status: 502 });

  return NextResponse.json({ free: false, orderId: order.id, keyId, amount: order.amount, currency: order.currency }, { status: 200 });
}
