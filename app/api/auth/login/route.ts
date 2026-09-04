import { NextResponse } from "next/server";
import { findUserByIdentifier } from "@/lib/users";
import { createUserSessionToken, getUserCookieName, verifyPassword } from "@/lib/userAuth";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/rateLimit";

type LoginPayload = { identifier?: unknown; password?: unknown };

export async function POST(request: Request) {
  if (!process.env.SESSION_SECRET) return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  const limit = await checkRateLimit(clientKey(request, "login"), RATE_LIMITS.login);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter, "Too many attempts. Try again later.");

  let payload: LoginPayload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const rawIdentifier = typeof payload.identifier === "string" ? payload.identifier.trim().toLowerCase() : "";
  const identifier = rawIdentifier.includes("@") ? rawIdentifier : rawIdentifier.replace(/[\s-]/g, "");
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!identifier || !password) return NextResponse.json({ error: "Enter your email or phone, and your password." }, { status: 400 });

  const user = await findUserByIdentifier(identifier);
  if (!user || !(await verifyPassword(password, user.password_hash))) return NextResponse.json({ error: "Incorrect email/phone or password." }, { status: 401 });

  const token = createUserSessionToken(user.id);
  if (!token) return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  const response = NextResponse.json({ authenticated: true, name: user.name });
  response.cookies.set(getUserCookieName(), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
