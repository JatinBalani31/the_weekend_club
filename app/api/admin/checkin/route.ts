import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";

/**
 * POST: Mark a registration as checked in by registration_code.
 * GET:  Look up a registration by code (for QR scan result display).
 */
export async function GET(request: Request) {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Provide a registration code." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data, error } = await supabase
    .from("registrations")
    .select("id, registration_code, name, email, phone, payment_status, checked_in_at, event:events(title, date)")
    .eq("registration_code", code)
    .maybeSingle();

  if (error) {
    console.error("Check-in lookup failed", error);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }

  if (!data) return NextResponse.json({ error: "No registration found for this code." }, { status: 404 });

  const row = data as typeof data & { event: unknown };
  const event = Array.isArray(row.event) ? row.event[0] : row.event;

  return NextResponse.json({
    id: row.id,
    code: row.registration_code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    paymentStatus: row.payment_status,
    checkedInAt: row.checked_in_at,
    event: event ?? null,
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const code = (typeof body.code === "string" ? body.code : "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Provide a registration code." }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data: registration, error: lookupError } = await supabase
    .from("registrations")
    .select("id, registration_code, name, payment_status, checked_in_at, event:events(title)")
    .eq("registration_code", code)
    .maybeSingle();

  if (lookupError || !registration) {
    return NextResponse.json({ error: "No registration found for this code." }, { status: 404 });
  }

  if (registration.payment_status !== "paid") {
    return NextResponse.json({ error: "This registration is not paid.", name: registration.name }, { status: 400 });
  }

  if (registration.checked_in_at) {
    return NextResponse.json({
      error: "Already checked in.",
      name: registration.name,
      checkedInAt: registration.checked_in_at,
    }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("registrations")
    .update({ checked_in_at: now })
    .eq("id", registration.id);

  if (updateError) {
    console.error("Check-in update failed", updateError);
    return NextResponse.json({ error: "Could not check in." }, { status: 500 });
  }

  const event = Array.isArray(registration.event) ? registration.event[0] : registration.event;

  return NextResponse.json({
    ok: true,
    name: registration.name,
    code: registration.registration_code,
    event: event ?? null,
    checkedInAt: now,
  });
}
