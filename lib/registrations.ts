import { getSupabaseAdminClient } from "@/lib/supabase";
import { devFindTierName, devGetAllRegistrations, devGetEventById, devGetRegistrationById, isDevStoreEnabled } from "@/lib/devStore";

export type RegistrationDetails = {
  id: string;
  name: string;
  email: string;
  email_updates: boolean;
  payment_status: "pending" | "paid" | "failed";
  razorpay_order_id: string | null;
  payment_id: string | null;
  ticket_tier_id: string | null;
  charged_price: number | null;
  event: {
    title: string;
    slug: string;
    date: string;
    location: string;
  } | null;
};

export type AdminRegistration = {
  id: string;
  name: string;
  email: string;
  phone: string;
  strava_handle: string | null;
  email_updates: boolean;
  payment_status: "pending" | "paid" | "failed";
  charged_price: number | null;
  created_at: string;
  event: { id: string; title: string } | null;
  ticket_tier: { name: string } | null;
};

export async function getRegistrationById(id: string): Promise<RegistrationDetails | null> {
  if (isDevStoreEnabled()) {
    const registration = devGetRegistrationById(id);
    if (!registration) return null;
    const event = devGetEventById(registration.event_id);
    return {
      id: registration.id,
      name: registration.name,
      email: registration.email,
      email_updates: registration.email_updates,
      payment_status: registration.payment_status,
      razorpay_order_id: registration.razorpay_order_id,
      payment_id: registration.payment_id,
      ticket_tier_id: registration.ticket_tier_id,
      charged_price: registration.charged_price,
      event: event ? { title: event.title, slug: event.slug, date: event.date, location: event.location } : null,
    };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("registrations")
    .select("id, name, email, email_updates, payment_status, razorpay_order_id, payment_id, ticket_tier_id, charged_price, event:events(title, slug, date, location)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load registration", error);
    return null;
  }

  return data as RegistrationDetails | null;
}

export async function getAllRegistrations(): Promise<AdminRegistration[]> {
  if (isDevStoreEnabled()) {
    return devGetAllRegistrations().map((registration) => {
      const event = devGetEventById(registration.event_id);
      const tierName = devFindTierName(registration.event_id, registration.ticket_tier_id);
      return {
        id: registration.id,
        name: registration.name,
        email: registration.email,
        phone: registration.phone,
        strava_handle: registration.strava_handle,
        email_updates: registration.email_updates,
        payment_status: registration.payment_status,
        charged_price: registration.charged_price,
        created_at: registration.created_at,
        event: event ? { id: event.id, title: event.title } : null,
        ticket_tier: tierName ? { name: tierName } : null,
      };
    });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("registrations")
    .select("id, name, email, phone, strava_handle, email_updates, payment_status, charged_price, created_at, event:events(id, title), ticket_tier:ticket_tiers(name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load registrations", error);
    return [];
  }

  return (data ?? []).map((registration) => ({
    ...registration,
    event: Array.isArray(registration.event) ? registration.event[0] ?? null : registration.event,
    ticket_tier: Array.isArray(registration.ticket_tier) ? registration.ticket_tier[0] ?? null : registration.ticket_tier,
  })) as AdminRegistration[];
}