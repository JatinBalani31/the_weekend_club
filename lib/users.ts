import { getSupabaseAdminClient } from "@/lib/supabase";
import { hashPassword } from "@/lib/userAuth";
import {
  devCreateUser,
  devFindTierName,
  devFindUserByEmailOrPhone,
  devGetEventById,
  devGetRegistrationsByUser,
  devGetUserById,
  devUpdateUser,
  isDevStoreEnabled,
} from "@/lib/devStore";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type UserWithPasswordHash = PublicUser & { password_hash: string };

export type UserRegistration = {
  id: string;
  payment_status: "pending" | "paid" | "failed";
  charged_price: number | null;
  created_at: string;
  event: { title: string; slug: string; date: string; location: string } | null;
  ticket_tier: { name: string } | null;
};

export async function createUser(input: { name: string; email: string; phone: string; password: string }): Promise<{ user?: PublicUser; error?: string }> {
  if (isDevStoreEnabled()) {
    const { user, error } = devCreateUser({ name: input.name, email: input.email, phone: input.phone, password_hash: hashPassword(input.password) });
    if (error || !user) return { error: error ?? "Could not create your account." };
    return { user: { id: user.id, name: user.name, email: user.email, phone: user.phone } };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Accounts are not configured yet." };

  const { data: existingEmail } = await supabase.from("users").select("id").eq("email", input.email).maybeSingle();
  if (existingEmail) return { error: "An account with this email already exists." };

  const { data: existingPhone } = await supabase.from("users").select("id").eq("phone", input.phone).maybeSingle();
  if (existingPhone) return { error: "An account with this phone number already exists." };

  const { data, error } = await supabase
    .from("users")
    .insert({ name: input.name, email: input.email, phone: input.phone, password_hash: hashPassword(input.password) })
    .select("id, name, email, phone")
    .single();

  if (error || !data) {
    console.error("Unable to create user", error);
    return { error: "Could not create your account." };
  }
  return { user: data };
}

export async function findUserByIdentifier(identifier: string): Promise<UserWithPasswordHash | null> {
  if (isDevStoreEnabled()) {
    const user = devFindUserByEmailOrPhone(identifier);
    return user ? { id: user.id, name: user.name, email: user.email, phone: user.phone, password_hash: user.password_hash } : null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const column = identifier.includes("@") ? "email" : "phone";
  const { data, error } = await supabase.from("users").select("id, name, email, phone, password_hash").eq(column, identifier).maybeSingle();
  if (error) {
    console.error("Unable to look up user", error);
    return null;
  }
  return data as UserWithPasswordHash | null;
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  if (isDevStoreEnabled()) {
    const user = devGetUserById(id);
    return user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("users").select("id, name, email, phone").eq("id", id).maybeSingle();
  if (error) {
    console.error("Unable to load user", error);
    return null;
  }
  return data as PublicUser | null;
}

export async function updateUser(id: string, patch: { name: string; email: string; phone: string; password?: string }): Promise<{ error?: string }> {
  const passwordHash = patch.password ? hashPassword(patch.password) : undefined;

  if (isDevStoreEnabled()) {
    const { error } = devUpdateUser(id, { name: patch.name, email: patch.email, phone: patch.phone, password_hash: passwordHash });
    return error ? { error } : {};
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Accounts are not configured yet." };

  const { data: emailOwner } = await supabase.from("users").select("id").eq("email", patch.email).neq("id", id).maybeSingle();
  if (emailOwner) return { error: "An account with this email already exists." };

  const { data: phoneOwner } = await supabase.from("users").select("id").eq("phone", patch.phone).neq("id", id).maybeSingle();
  if (phoneOwner) return { error: "An account with this phone number already exists." };

  const { error } = await supabase
    .from("users")
    .update({ name: patch.name, email: patch.email, phone: patch.phone, ...(passwordHash ? { password_hash: passwordHash } : {}) })
    .eq("id", id);

  if (error) {
    console.error("Unable to update user", error);
    return { error: "Could not save your details." };
  }
  return {};
}

export async function getUserRegistrations(userId: string): Promise<UserRegistration[]> {
  if (isDevStoreEnabled()) {
    return devGetRegistrationsByUser(userId).map((registration) => {
      const event = devGetEventById(registration.event_id);
      const tierName = devFindTierName(registration.event_id, registration.ticket_tier_id);
      return {
        id: registration.id,
        payment_status: registration.payment_status,
        charged_price: registration.charged_price,
        created_at: registration.created_at,
        event: event ? { title: event.title, slug: event.slug, date: event.date, location: event.location } : null,
        ticket_tier: tierName ? { name: tierName } : null,
      };
    });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("registrations")
    .select("id, payment_status, charged_price, created_at, event:events(title, slug, date, location), ticket_tier:ticket_tiers(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load your registrations", error);
    return [];
  }

  return (data ?? []).map((registration) => ({
    ...registration,
    event: Array.isArray(registration.event) ? registration.event[0] ?? null : registration.event,
    ticket_tier: Array.isArray(registration.ticket_tier) ? registration.ticket_tier[0] ?? null : registration.ticket_tier,
  })) as UserRegistration[];
}
