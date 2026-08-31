import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const PENDING_COOKIE_NAME = "admin_pending";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function getSessionToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return crypto.createHmac("sha256", password).update("the-weekend-club-admin").digest("hex");
}

function getPendingToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return crypto.createHmac("sha256", password).update("the-weekend-club-admin-pending").digest("hex");
}

function timingSafeStringEqual(expected: string, value: string) {
  const expectedBuffer = Buffer.from(expected);
  const valueBuffer = Buffer.from(value);
  return expectedBuffer.length === valueBuffer.length && crypto.timingSafeEqual(expectedBuffer, valueBuffer);
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function getAdminSessionToken() {
  return getSessionToken();
}

export function isValidAdminSession(value: string | undefined) {
  const expected = getSessionToken();
  if (!expected || !value) return false;
  return timingSafeStringEqual(expected, value);
}

export function isAdminRequestAuthorized() {
  return isValidAdminSession(cookies().get(COOKIE_NAME)?.value);
}

export function getAdminPendingCookieName() {
  return PENDING_COOKIE_NAME;
}

export function getAdminPendingToken() {
  return getPendingToken();
}

export function isValidAdminPendingSession(value: string | undefined) {
  const expected = getPendingToken();
  if (!expected || !value) return false;
  return timingSafeStringEqual(expected, value);
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
