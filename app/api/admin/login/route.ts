import { NextResponse } from "next/server";
import { getAdminCookieName, getAdminSessionToken } from "@/lib/admin";

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });

  let payload: { password?: unknown };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (payload.password !== configuredPassword) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

  const token = getAdminSessionToken();
  if (!token) return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(getAdminCookieName(), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
