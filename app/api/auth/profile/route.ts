import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findUserByIdentifier, getUserById, updateUser } from "@/lib/users";
import { getUserCookieName, getUserIdFromSessionToken, verifyPassword } from "@/lib/userAuth";

type ProfilePayload = { name?: unknown; email?: unknown; phone?: unknown; currentPassword?: unknown; newPassword?: unknown };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

export async function PATCH(request: Request) {
  const userId = getUserIdFromSessionToken(cookies().get(getUserCookieName())?.value);
  if (!userId) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const existing = await getUserById(userId);
  if (!existing) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

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
