import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin";
import { createEventWithTiers, getAllEventsAdmin } from "@/lib/events";
import { parseEventInput } from "@/lib/eventValidation";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequestAuthorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const events = await getAllEventsAdmin();
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const { input, error } = parseEventInput(payload);
  if (error || !input) return NextResponse.json({ error }, { status: 400 });

  const result = await createEventWithTiers(input);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ created: true }, { status: 201 });
}
