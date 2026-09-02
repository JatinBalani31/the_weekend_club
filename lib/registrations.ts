import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { registrationCodeFromId } from "@/lib/registrationCode";
import { devFindTierName, devGetAllRegistrations, devGetEventById, devGetRegistrationById, isDevStoreEnabled } from "@/lib/devStore";

/**
 * `registrations.registration_code` arrived in the 20260902000000 migration.
 * If the app is deployed before that SQL is applied, every read touching the
 * column would 400 and take the registration pages down, so we probe once and
 * fall back to codes derived from the row id until the column exists.
 *
 * Once the migration is applied everywhere, this and `registrationCodeFromId`
 * can go and the selects can name the column unconditionally.
 */
let codeColumnAvailable: boolean | null = null;

export async function hasRegistrationCodeColumn(supabase: SupabaseClient) {
  if (codeColumnAvailable !== null) return codeColumnAvailable;
  const { error } = await supabase.from("registrations").select("registration_code").limit(1);
  codeColumnAvailable = error?.code !== "42703"; // 42703 is undefined_column
  if (!codeColumnAvailable) {
    console.warn("registrations.registration_code is missing - apply the 20260902000000 migration. Using codes derived from row ids meanwhile.");
  }
  return codeColumnAvailable;
}

/** Prefixes the column onto a select list only when the column exists. */
function withCode(hasColumn: boolean, columns: string) {
  return hasColumn ? `registration_code, ${columns}` : columns;
}

/**
 * A row as it actually comes back: embedded relations arrive as arrays, and
 * `registration_code` is absent until the migration is applied. Needed because
 * the select list is assembled at runtime, so Supabase cannot infer the shape.
 */
type RawRow<T extends { id: string; registration_code: string }> = Omit<T, "registration_code" | "event" | "ticket_tier"> & {
  registration_code?: string | null;
  event?: unknown;
  ticket_tier?: unknown;
};

export type RegistrationDetails = {
  id: string;
  registration_code: string;
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
  registration_code: string;
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
      registration_code: registration.registration_code ?? registrationCodeFromId(registration.id),
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
  const hasColumn = await hasRegistrationCodeColumn(supabase);

  const { data, error } = await supabase
    .from("registrations")
    .select(withCode(hasColumn, "id, name, email, email_updates, payment_status, razorpay_order_id, payment_id, ticket_tier_id, charged_price, event:events(title, slug, date, location)"))
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load registration", error);
    return null;
  }

  if (!data) return null;

  // The select list is built at runtime, so Supabase cannot infer the row shape.
  const row = data as unknown as RawRow<RegistrationDetails>;
  return {
    ...row,
    // Supabase types an embedded relation as an array; collapse it to one row.
    event: Array.isArray(row.event) ? row.event[0] ?? null : row.event,
    registration_code: row.registration_code ?? registrationCodeFromId(row.id),
  } as RegistrationDetails;
}

export async function getAllRegistrations(): Promise<AdminRegistration[]> {
  if (isDevStoreEnabled()) {
    return devGetAllRegistrations().map((registration) => {
      const event = devGetEventById(registration.event_id);
      const tierName = devFindTierName(registration.event_id, registration.ticket_tier_id);
      return {
        id: registration.id,
        registration_code: registration.registration_code ?? registrationCodeFromId(registration.id),
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
  const hasColumn = await hasRegistrationCodeColumn(supabase);

  const { data, error } = await supabase
    .from("registrations")
    .select(withCode(hasColumn, "id, name, email, phone, strava_handle, email_updates, payment_status, charged_price, created_at, event:events(id, title), ticket_tier:ticket_tiers(name)"))
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load registrations", error);
    return [];
  }

  return ((data ?? []) as unknown as RawRow<AdminRegistration>[]).map((row) => ({
    ...row,
    registration_code: row.registration_code ?? registrationCodeFromId(row.id),
    event: Array.isArray(row.event) ? row.event[0] ?? null : row.event,
    ticket_tier: Array.isArray(row.ticket_tier) ? row.ticket_tier[0] ?? null : row.ticket_tier,
  })) as AdminRegistration[];
}