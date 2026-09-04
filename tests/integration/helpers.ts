import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

/**
 * Every row these specs create carries this marker so cleanup can find it, and
 * so a leftover row is obviously test data rather than a real registration.
 */
export const TEST_MARKER = "vitest-probe";
export const testEmail = (label: string) => `${TEST_MARKER}-${label}-${Date.now()}@example.com`;

/** Random valid Indian mobile, to dodge the unique constraint between runs. */
export function testPhone() {
  return `9${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 900) + 100)}`;
}

export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured; integration specs need .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON responses (redirects, HTML) are returned as text */
  }
  return { status: response.status, body: body as Record<string, unknown>, headers: response.headers };
}

/** Extracts a cookie value from a Set-Cookie header for reuse on later calls. */
export function cookieFrom(headers: Headers, name: string) {
  const raw = headers.get("set-cookie") ?? "";
  const match = raw.match(new RegExp(`${name}=([^;]+)`));
  return match ? `${name}=${match[1]}` : "";
}

export async function adminSessionCookie() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  const response = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (response.status !== 200) throw new Error(`admin login failed: ${response.status}`);
  return cookieFrom(response.headers, "admin_session");
}

/** Creates an event directly, bypassing the UI, for specs that need a fixture. */
export async function createEvent(overrides: Record<string, unknown> = {}) {
  const supabase = admin();
  const stamp = Date.now() + Math.floor(Math.random() * 1000);
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: `${TEST_MARKER} Event ${stamp}`,
      slug: `${TEST_MARKER}-event-${stamp}`,
      description: "Created by the integration suite.",
      banner_image_url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=60",
      // Far future so it always counts as upcoming.
      date: "2030-01-10T01:30:00+00:00",
      location: "Test Location",
      price: 0,
      capacity: 50,
      event_type: "run",
      is_active: true,
      ...overrides,
    })
    .select("id, slug, title, date, price, capacity")
    .single();
  if (error) throw new Error(`could not create test event: ${error.message}`);
  return data;
}

/** Removes everything this suite created, matched on the marker. */
export async function cleanupTestData() {
  const supabase = admin();
  await supabase.from("registrations").delete().like("email", `${TEST_MARKER}%`);
  const { data: events } = await supabase.from("events").select("id").like("slug", `${TEST_MARKER}%`);
  for (const event of events ?? []) {
    await supabase.from("registrations").delete().eq("event_id", event.id);
    await supabase.from("events").delete().eq("id", event.id);
  }
  await supabase.from("users").delete().like("email", `${TEST_MARKER}%`);
}

/** True when a migration-dependent column exists, so specs can skip. */
export async function hasColumn(table: string, column: string) {
  const { error } = await admin().from(table).select(column).limit(1);
  // 42703 undefined_column, 42P01 undefined_table - either means not migrated.
  return error?.code !== "42703" && error?.code !== "42P01";
}

/** True when a migration-dependent table exists. */
export async function hasTable(table: string) {
  const { error } = await admin().from(table).select("*").limit(1);
  return error?.code !== "42P01" && !/does not exist|schema cache/i.test(error?.message ?? "");
}

/**
 * React renders adjacent JSX expressions with `<!-- -->` separators, so text
 * that reads as "0 registrations" on screen is not contiguous in the markup.
 */
export function visibleText(html: string) {
  return html.replace(/<!--\s*-->/g, "");
}
