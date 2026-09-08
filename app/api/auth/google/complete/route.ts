import { NextResponse } from "next/server";
import { completeGoogleSignup } from "@/lib/users";
import { createUserSessionToken, getUserCookieName } from "@/lib/userAuth";

const phonePattern = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

export async function POST(request: Request) {
  if (!process.env.SESSION_SECRET) return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  let payload: { userId?: string; phone?: string };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.replace(/[\s-]/g, "") : "";

  if (!userId) return NextResponse.json({ error: "Missing user." }, { status: 400 });
  if (!phonePattern.test(phone)) return NextResponse.json({ error: "Enter a valid Indian phone number." }, { status: 400 });

  const { user, error } = await completeGoogleSignup(userId, phone);
  if (error || !user) return NextResponse.json({ error: error ?? "Could not save your details." }, { status: 409 });

  const token = createUserSessionToken(user.id);
  if (!token) return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  const response = NextResponse.json({ authenticated: true, name: user.name });
  response.cookies.set(getUserCookieName(), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
