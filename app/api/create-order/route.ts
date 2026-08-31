import { NextResponse } from "next/server";
import { getRegistrationById } from "@/lib/registrations";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { devGetEventById, devGetRegistrationById, devSetRegistrationPaid, isDevStoreEnabled } from "@/lib/devStore";

type OrderPayload = { registrationId?: unknown };

export async function POST(request: Request) {
  let payload: OrderPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const registrationId = typeof payload.registrationId === "string" ? payload.registrationId : "";
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!registrationId) return NextResponse.json({ error: "Registration is required." }, { status: 400 });

  if (isDevStoreEnabled()) {
    const registration = devGetRegistrationById(registrationId);
    if (!registration) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    const event = devGetEventById(registration.event_id);
    if (!event || !event.is_active || new Date(event.date) <= new Date()) return NextResponse.json({ error: "This event is no longer available." }, { status: 409 });

    const amount = Number(registration.charged_price ?? event.price);
    if (amount <= 0) {
      devSetRegistrationPaid(registrationId, null);
      return NextResponse.json({ free: true, registrationId }, { status: 200 });
    }
    return NextResponse.json({ error: "Paid events need Razorpay keys. Set the event price to 0 to test registration locally." }, { status: 503 });
  }

  const registration = await getRegistrationById(registrationId);
  if (!registration || !registration.event) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  if (registration.payment_status !== "pending") return NextResponse.json({ error: "This registration is no longer payable." }, { status: 409 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Payment is not configured yet." }, { status: 503 });

  const { data: registrationRow, error: registrationError } = await supabase.from("registrations").select("event_id, razorpay_order_id, charged_price, events(price, is_active, date)").eq("id", registrationId).maybeSingle();
  if (registrationError || !registrationRow) return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  const joinedEvent = Array.isArray(registrationRow.events) ? registrationRow.events[0] : registrationRow.events;
  if (!joinedEvent || !joinedEvent.is_active || new Date(joinedEvent.date) <= new Date()) return NextResponse.json({ error: "This event is no longer available." }, { status: 409 });

  // Free events need no payment provider, so settle them before requiring Razorpay keys.
  const amountInRupees = Number(registrationRow.charged_price ?? joinedEvent.price);
  if (amountInRupees <= 0) {
    await supabase.from("registrations").update({ payment_status: "paid" }).eq("id", registrationId);
    return NextResponse.json({ free: true, registrationId }, { status: 200 });
  }

  if (!keyId || !keySecret) return NextResponse.json({ error: "Payment is not configured yet." }, { status: 503 });

  if (registrationRow.razorpay_order_id) return NextResponse.json({ orderId: registrationRow.razorpay_order_id, keyId, amount: Math.round(amountInRupees * 100), currency: "INR" });

  const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(amountInRupees * 100), currency: "INR", receipt: `registration_${registrationId}`, notes: { registration_id: registrationId } }),
  });
  if (!orderResponse.ok) {
    console.error("Unable to create Razorpay order", orderResponse.status);
    return NextResponse.json({ error: "Could not start payment." }, { status: 502 });
  }
  const order = await orderResponse.json() as { id?: string; amount?: number; currency?: string };
  if (!order.id) return NextResponse.json({ error: "Payment provider returned an invalid order." }, { status: 502 });

  const { error: updateError } = await supabase.from("registrations").update({ razorpay_order_id: order.id }).eq("id", registrationId).is("razorpay_order_id", null);
  if (updateError) return NextResponse.json({ error: "Could not save payment order." }, { status: 500 });
  return NextResponse.json({ orderId: order.id, keyId, amount: order.amount, currency: order.currency });
}
