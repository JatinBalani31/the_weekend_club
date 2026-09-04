import { NextResponse } from "next/server";
import { createUser } from "@/lib/users";
import { createUserSessionToken, getUserCookieName } from "@/lib/userAuth";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/rateLimit";

type SignupPayload = { name?: unknown; email?: unknown; phone?: unknown; password?: unknown };

/** Small deny-list of the passwords credential-stuffing lists try first. */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwerty123", "qwertyui", "11111111", "abc12345", "iloveyou", "admin123",
  "welcome1", "welcome123", "letmein1", "p@ssw0rd", "passw0rd", "football",
  "sunshine", "princess", "changeme", "trustno1", "baseball", "starwars",
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

export async function POST(request: Request) {
  if (!process.env.SESSION_SECRET) return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  const limit = await checkRateLimit(clientKey(request, "signup"), RATE_LIMITS.signup);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter, "Too many accounts created from this network. Try again later.");

  let payload: SignupPayload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.replace(/[\s-]/g, "") : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!name || !emailPattern.test(email) || !phonePattern.test(phone)) return NextResponse.json({ error: "Please check the details you entered." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Use a password with at least 8 characters." }, { status: 400 });
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return NextResponse.json({ error: "That password is too common. Please choose another." }, { status: 400 });

  const { user, error } = await createUser({ name, email, phone, password });
  if (error || !user) return NextResponse.json({ error: error ?? "Could not create your account." }, { status: 409 });

  const token = createUserSessionToken(user.id);
  if (!token) return NextResponse.json({ error: "Accounts are not configured yet." }, { status: 503 });

  const response = NextResponse.json({ authenticated: true, name: user.name });
  response.cookies.set(getUserCookieName(), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
