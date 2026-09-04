import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { isDevStoreEnabled } from "@/lib/devStore";
import { hasColumn } from "@/lib/schemaProbe";

const COOKIE_NAME = "admin_session";
const PENDING_COOKIE_NAME = "admin_pending";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Server-side lifetime of an admin session, independent of the cookie maxAge. */
const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function timingSafeStringEqual(expected: string, value: string) {
  const expectedBuffer = Buffer.from(expected);
  const valueBuffer = Buffer.from(value);
  return expectedBuffer.length === valueBuffer.length && crypto.timingSafeEqual(expectedBuffer, valueBuffer);
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

/**
 * Admin tokens are `issuedAt.signature`.
 *
 * The old token was a bare HMAC of the password over a fixed string, so it was
 * the same value forever: it could not expire, and the only way to revoke a
 * leaked cookie was to change ADMIN_PASSWORD and redeploy. Carrying the issue
 * time lets the server expire it, and `admin_settings.sessions_valid_from`
 * revokes every outstanding session at once.
 */
export async function getAdminSessionToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const issuedAt = Date.now();
  const signature = crypto.createHmac("sha256", password).update(`admin:${issuedAt}`).digest("hex");
  return `${issuedAt}.${signature}`;
}

async function getAdminSessionsValidFrom(): Promise<Date | null> {
  if (isDevStoreEnabled()) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  if (!(await hasColumn(supabase, "admin_settings", "sessions_valid_from"))) return null;
  const { data, error } = await supabase.from("admin_settings").select("sessions_valid_from").eq("id", true).maybeSingle();
  if (error || !data?.sessions_valid_from) return null;
  return new Date(data.sessions_valid_from);
}

export async function isValidAdminSession(value: string | undefined) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !value) return false;

  const [issuedAtRaw, signature] = value.split(".");
  if (!issuedAtRaw || !signature) return false;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;

  const expected = crypto.createHmac("sha256", password).update(`admin:${issuedAt}`).digest("hex");
  if (!timingSafeStringEqual(expected, signature)) return false;

  const age = Date.now() - issuedAt;
  if (age > ADMIN_SESSION_MAX_AGE_MS || age < -60_000) return false;

  const validFrom = await getAdminSessionsValidFrom();
  if (validFrom && issuedAt < validFrom.getTime() - 1000) return false;

  return true;
}

export async function isAdminRequestAuthorized() {
  return isValidAdminSession(cookies().get(COOKIE_NAME)?.value);
}

/** Ends every admin session, including any cookie that has leaked. */
export async function revokeAdminSessions(): Promise<{ error?: string }> {
  if (isDevStoreEnabled()) return {};
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Admin access is not configured." };
  const { error } = await supabase.from("admin_settings").update({ sessions_valid_from: new Date().toISOString() }).eq("id", true);
  if (error) {
    console.error("Unable to revoke admin sessions", error);
    return { error: "Could not sign out other admin sessions." };
  }
  return {};
}

export function getAdminPendingCookieName() {
  return PENDING_COOKIE_NAME;
}

/* ---------------------------------------------------------------------------
 * TOTP (two-factor) helpers.
 *
 * Two-factor auth is intentionally NOT wired into the admin login right now —
 * /api/admin/login signs in on the password alone. These helpers, the pending
 * cookie above, and the admin_settings table are kept ready for when 2FA is
 * turned back on; nothing else calls them today.
 * ------------------------------------------------------------------------ */

function base32Encode(buffer: Buffer) {
  let bits = "";
  for (let i = 0; i < buffer.length; i++) bits += buffer[i].toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return output;
}

function base32Decode(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function getOtpAuthUrl(secret: string) {
  const label = encodeURIComponent("The Weekend Club:Admin");
  const issuer = encodeURIComponent("The Weekend Club");
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

function computeTotpCode(secret: string, counter: number) {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const truncated = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return (truncated % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
}

export function verifyTotpToken(token: string, secret: string, windowSteps = 1) {
  const cleanedToken = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleanedToken)) return false;
  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const expected = computeTotpCode(secret, currentCounter + offset);
    if (timingSafeStringEqual(expected, cleanedToken)) return true;
  }
  return false;
}
