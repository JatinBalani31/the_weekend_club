import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findUserByIdentifier, getSessionUser, updateUser } from "@/lib/users";
import { getUserCookieName, verifyPassword } from "@/lib/userAuth";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/rateLimit";

type ProfilePayload = { name?: unknown; email?: unknown; phone?: unknown; currentPassword?: unknown; newPassword?: unknown };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

export async function PATCH(request: Request) {
  const limit = await checkRateLimit(clientKey(request, "profile"), RATE_LIMITS.profile);
  if (!limit.allowed) return tooManyRequests(limit.retryAfter, "Too many attempts. Try again later.");

  const existing = await getSessionUser(cookies().get(getUserCookieName())?.value);
  if (!existing) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const userId = existing.id;

  let payload: ProfilePayload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.replace(/[\s-]/g, "") : "";
  const currentPassword = typeof payload.currentPassword === "string" ? payload.currentPassword : "";
  const newPassword = typeof payload.newPassword === "string" ? payload.newPassword : "";

  if (!name || !emailPattern.test(email) || !phonePattern.test(phone)) {
    return NextResponse.json({ error: "Please check the details you entered." }, { status: 400 });
  }

  // Changing the password requires proving knowledge of the current one.
  if (newPassword) {
    if (newPassword.length < 8) return NextResponse.json({ error: "Use a new password with at least 8 characters." }, { status: 400 });
    const withHash = await findUserByIdentifier(existing.email);
    if (!withHash || !verifyPassword(currentPassword, withHash.password_hash)) {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 401 });
    }
  }

  const { error } = await updateUser(userId, { name, email, phone, password: newPassword || undefined });
  if (error) return NextResponse.json({ error }, { status: 409 });

  return NextResponse.json({ updated: true });
}
