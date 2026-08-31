import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUpcomingEventBySlug } from "@/lib/events";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getUserCookieName, getUserIdFromSessionToken } from "@/lib/userAuth";
import { devCreateRegistration, isDevStoreEnabled } from "@/lib/devStore";

type RegistrationPayload = {
  eventSlug?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  strava_handle?: unknown;
  ticket_tier_id?: unknown;
  email_updates?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

export async function POST(request: Request) {
  let payload: RegistrationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const eventSlug = typeof payload.eventSlug === "string" ? payload.eventSlug : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.replace(/[\s-]/g, "") : "";
  const stravaHandle = typeof payload.strava_handle === "string" ? payload.strava_handle.trim() || null : null;
  const ticketTierId = typeof payload.ticket_tier_id === "string" ? payload.ticket_tier_id : null;
  const emailUpdates = payload.email_updates === true;

  if (!eventSlug || !name || !emailPattern.test(email) || !phonePattern.test(phone)) {
    return NextResponse.json({ error: "Please check the details you entered." }, { status: 400 });
  }

  const event = await getUpcomingEventBySlug(eventSlug);
  if (!event) return NextResponse.json({ error: "This event is no longer available." }, { status: 404 });

  const tier = ticketTierId ? event.ticket_tiers?.find((item) => item.id === ticketTierId && item.is_active && (!item.sale_ends_at || new Date(item.sale_ends_at) > new Date())) : null;
  if (event.ticket_tiers?.length && !tier) return NextResponse.json({ error: "Choose an available ticket tier." }, { status: 400 });

  const userId = getUserIdFromSessionToken(cookies().get(getUserCookieName())?.value);

  if (isDevStoreEnabled()) {
    const registration = devCreateRegistration({
      event_id: event.id, ticket_tier_id: tier?.id ?? null, charged_price: tier?.price ?? event.price,
      name, email, phone, strava_handle: stravaHandle, email_updates: emailUpdates, payment_status: "pending", user_id: userId,
    });
    return NextResponse.json({ registrationId: registration.id }, { status: 201 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Registration is not configured yet." }, { status: 503 });

  const { data, error } = await supabase
    .from("registrations")
    .insert({ event_id: event.id, ticket_tier_id: tier?.id ?? null, charged_price: tier?.price ?? event.price, name, email, phone, strava_handle: stravaHandle, email_updates: emailUpdates, payment_status: "pending", user_id: userId })
    .select("id")
    .single();

  if (error) {
    console.error("Unable to create registration", error);
    return NextResponse.json({ error: "Could not save your registration." }, { status: 500 });
  }

  return NextResponse.json({ registrationId: data.id }, { status: 201 });
}