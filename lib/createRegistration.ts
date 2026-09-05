import { getUpcomingEventBySlug, type Event, type TicketTier } from "@/lib/events";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateRegistrationCode } from "@/lib/registrationCode";
import { hasRegistrationCodeColumn } from "@/lib/registrations";
import { devCreateRegistration, devGetAllRegistrations, devSetRegistrationPaymentRefs, isDevStoreEnabled } from "@/lib/devStore";
import type { RegistrationInput } from "@/lib/registrationInput";

export type ResolvedEvent = { event: Event; tier: TicketTier | null; amount: number };

/**
 * Loads the event for a submission and resolves the ticket tier, deriving the
 * amount from the database. The price is never taken from the request, so a
 * tampered payload cannot change what is charged.
 */
export async function resolveEventForRegistration(input: RegistrationInput): Promise<{ resolved?: ResolvedEvent; error?: string; status?: number }> {
  const event = await getUpcomingEventBySlug(input.eventSlug);
  if (!event) return { error: "This event is no longer available.", status: 404 };

  const tier = input.ticketTierId
    ? event.ticket_tiers?.find(
        (item) => item.id === input.ticketTierId && item.is_active && (!item.sale_ends_at || new Date(item.sale_ends_at) > new Date()),
      ) ?? null
    : null;

  if (event.ticket_tiers?.length && !tier) return { error: "Choose an available ticket tier.", status: 400 };

  // Check remaining space before the caller opens checkout. The database
  // trigger is still the authority - it locks the event row, so it is what
  // makes two simultaneous registrations safe - but without this check a full
  // event would open Razorpay, take the money, and only then be rejected and
  // refunded. Better not to charge at all.
  const taken = await countPaidRegistrations(event.id, tier?.id ?? null);
  if (taken.event >= event.capacity) return { error: "This event is now full.", status: 409 };
  if (tier && taken.tier !== null && taken.tier >= tier.capacity) {
    return { error: "That ticket tier is now sold out.", status: 409 };
  }

  return { resolved: { event, tier, amount: Number(tier?.price ?? event.price) } };
}

/** Counts confirmed registrations against an event, and its tier if given. */
async function countPaidRegistrations(eventId: string, tierId: string | null) {
  if (isDevStoreEnabled()) {
    const rows = devGetAllRegistrations().filter((item) => item.payment_status === "paid");
    return {
      event: rows.filter((item) => item.event_id === eventId).length,
      tier: tierId ? rows.filter((item) => item.ticket_tier_id === tierId).length : null,
    };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { event: 0, tier: null };

  const { count: eventCount } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("payment_status", "paid");

  let tierCount: number | null = null;
  if (tierId) {
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("ticket_tier_id", tierId)
      .eq("payment_status", "paid");
    tierCount = count ?? 0;
  }

  return { event: eventCount ?? 0, tier: tierCount };
}

/**
 * Finds an existing confirmed registration for this person on this event.
 *
 * Without this the same person could register twice - harmless noise on a free
 * event, but a second charge on a paid one, and easy to trigger by
 * double-submitting or refreshing. Matching on email keeps it predictable for
 * the attendee, who is told about the booking they already hold.
 */
export async function findExistingRegistration(eventId: string, email: string): Promise<{ id: string; registration_code?: string } | null> {
  if (isDevStoreEnabled()) {
    const existing = devGetAllRegistrations().find(
      (item) => item.event_id === eventId && item.email === email && item.payment_status === "paid",
    );
    return existing ? { id: existing.id, registration_code: existing.registration_code } : null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("email", email)
    .eq("payment_status", "paid")
    .maybeSingle();

  return data ? { id: data.id } : null;
}

/**
 * Writes a registration. Only ever called once the spot is actually secured -
 * either the event is free, or payment has been verified - so rows are never
 * left behind for abandoned checkouts.
 */
export async function persistRegistration(params: {
  input: RegistrationInput;
  resolved: ResolvedEvent;
  userId: string | null;
  paymentStatus: "paid";
  razorpayOrderId?: string | null;
  paymentId?: string | null;
  // `created` distinguishes a fresh row from one an earlier call already made,
  // so the confirmation email is sent once even though the browser callback and
  // the webhook both complete the same payment.
}): Promise<{ registrationId?: string; created?: boolean; error?: string }> {
  const { input, resolved, userId, razorpayOrderId = null, paymentId = null } = params;

  if (isDevStoreEnabled()) {
    const existing = razorpayOrderId ? devGetAllRegistrations().find((item) => item.razorpay_order_id === razorpayOrderId) : null;
    if (existing) return { registrationId: existing.id, created: false };

    const registration = devCreateRegistration({
      event_id: resolved.event.id,
      ticket_tier_id: resolved.tier?.id ?? null,
      charged_price: resolved.amount,
      name: input.name,
      email: input.email,
      phone: input.phone,
      strava_handle: input.stravaHandle,
      email_updates: input.emailUpdates,
      payment_status: "paid",
      user_id: userId,
      registration_code: generateRegistrationCode(),
    });
    if (razorpayOrderId || paymentId) devSetRegistrationPaymentRefs(registration.id, razorpayOrderId, paymentId);
    return { registrationId: registration.id, created: true };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Registration is not configured yet." };

  // A retried callback (or a reloaded success page) must not create a second row.
  if (razorpayOrderId) {
    const { data: existing } = await supabase.from("registrations").select("id").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
    if (existing) return { registrationId: existing.id, created: false };
  }

  // A signed session can outlive the account it points at. Linking to a missing
  // user would fail the foreign key - after the card has already been charged -
  // so fall back to an unlinked registration rather than losing it.
  let ownerId = userId;
  if (ownerId) {
    const { data: owner } = await supabase.from("users").select("id").eq("id", ownerId).maybeSingle();
    if (!owner) ownerId = null;
  }

  const row: Record<string, unknown> = {
    event_id: resolved.event.id,
    ticket_tier_id: resolved.tier?.id ?? null,
    charged_price: resolved.amount,
    name: input.name,
    email: input.email,
    phone: input.phone,
    strava_handle: input.stravaHandle,
    email_updates: input.emailUpdates,
    payment_status: "paid",
    user_id: ownerId,
    razorpay_order_id: razorpayOrderId,
    payment_id: paymentId,
  };

  const hasCodeColumn = await hasRegistrationCodeColumn(supabase);

  // Registration codes are random, so retry the rare collision before failing.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (hasCodeColumn) row.registration_code = generateRegistrationCode();

    const { data, error } = await supabase.from("registrations").insert(row).select("id").single();
    if (!error) return { registrationId: data.id, created: true };

    // Raised by the registrations_enforce_capacity trigger.
    if (error.message?.includes("EVENT_FULL")) return { error: "This event is now full." };
    if (error.message?.includes("TIER_FULL")) return { error: "That ticket tier is now sold out." };

    if (error.code !== "23505") {
      console.error("Unable to create registration", error);
      return { error: "Could not save your registration." };
    }

    // A duplicate on the order id means a concurrent callback already inserted it.
    if (razorpayOrderId) {
      const { data: existing } = await supabase.from("registrations").select("id").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
      if (existing) return { registrationId: existing.id, created: false };
    }
  }

  console.error("Unable to allocate a unique registration code after 3 attempts");
  return { error: "Could not save your registration." };
}
