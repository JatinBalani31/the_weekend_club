import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createGoogleUser } from "@/lib/users";
import {
  createUserSessionToken,
  getPendingSignupCookieName,
  getUserCookieName,
  parsePendingSignupToken,
} from "@/lib/userAuth";

const phonePattern = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

/**
 * Finishes a Google signup. The account being created comes from the signed
 * pending-signup cookie set by the OAuth callback, never from the request
 * body - a caller-supplied id here would let anyone mint a session for any
 * account just by naming it.
 */
export async function POST(request: Request) {
  if (!process.env.SESSION_SECRET) return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  const profile = parsePendingSignupToken(cookies().get(getPendingSignupCookieName())?.value);
  if (!profile) return NextResponse.json({ error: "Your signup session expired. Please sign in with Google again." }, { status: 401 });

  let payload: { phone?: unknown };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const phone = typeof payload.phone === "string" ? payload.phone.replace(/[\s-]/g, "") : "";
  if (!phonePattern.test(phone)) return NextResponse.json({ error: "Enter a valid Indian phone number." }, { status: 400 });

  const { user, error } = await createGoogleUser({ ...profile, phone });
  if (error || !user) return NextResponse.json({ error: error ?? "Could not create your account." }, { status: 409 });

  const token = createUserSessionToken(user.id);
  if (!token) return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  const response = NextResponse.json({ authenticated: true, name: user.name });
  response.cookies.set(getUserCookieName(), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  response.cookies.delete(getPendingSignupCookieName());
  return response;
}
