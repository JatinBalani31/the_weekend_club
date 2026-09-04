import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminCookieName, getAdminSessionToken } from "@/lib/admin";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/rateLimit";

/** Constant-time compare so a wrong password cannot be narrowed down by timing. */
function passwordMatches(candidate: string, configured: string) {
  const a = Buffer.from(candidate);
  const b = Buffer.from(configured);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });

  // The admin console reaches every registration, so this is the most valuable
  // door in the app: throttle it hard.
  const limit = await checkRateLimit(clientKey(request, "admin-login"), RATE_LIMITS.adminLogin);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter, "Too many attempts. Try again later.");

  let payload: { password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const password = typeof payload.password === "string" ? payload.password : "";
  if (!password || !passwordMatches(password, configuredPassword)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await getAdminSessionToken();
  if (!token) return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(getAdminCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
