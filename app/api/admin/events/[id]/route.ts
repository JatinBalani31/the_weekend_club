import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin";
import { deleteEventIfEmpty, setEventActive, updateEventWithTiers } from "@/lib/events";
import { parseEventInput } from "@/lib/eventValidation";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminRequestAuthorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  if (typeof payload === "object" && payload !== null && "is_active" in payload && Object.keys(payload).length === 1) {
    const isActive = (payload as { is_active: unknown }).is_active === true;
    const result = await setEventActive(params.id, isActive);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ updated: true });
  }

  const { input, error } = parseEventInput(payload);
  if (error || !input) return NextResponse.json({ error }, { status: 400 });

  const result = await updateEventWithTiers(params.id, input);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ updated: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminRequestAuthorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const result = await deleteEventIfEmpty(params.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ deleted: true });
}
