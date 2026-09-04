import crypto from "node:crypto";
import { promisify } from "node:util";

const COOKIE_NAME = "user_session";
const SCRYPT_KEY_LENGTH = 64;

/** Server-side lifetime of a session token, independent of the cookie's maxAge. */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const scrypt = promisify(crypto.scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

function timingSafeStringEqual(expected: string, value: string) {
  const expectedBuffer = Buffer.from(expected);
  const valueBuffer = Buffer.from(value);
  return expectedBuffer.length === valueBuffer.length && crypto.timingSafeEqual(expectedBuffer, valueBuffer);
}

/**
 * Password hashing uses the async scrypt: the sync variant blocks Node's event
 * loop for the whole derivation, so a burst of login attempts could stall every
 * other request on the instance.
 */
export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)).toString("hex");
  return timingSafeStringEqual(hash, candidate);
}

export function getUserCookieName() {
  return COOKIE_NAME;
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || null;
}

/**
 * Session tokens are `userId.issuedAt.signature`.
 *
 * Carrying the issue time is what makes them revocable: the server refuses any
 * token older than SESSION_MAX_AGE_MS, and `users.sessions_valid_from` refuses
 * anything issued before a password change or a "log out everywhere". Without
 * the timestamp a stolen token stayed valid forever, since signing out only
 * removed the cookie from the one browser that had it.
 */
export function createUserSessionToken(userId: string) {
  const secret = getSessionSecret();
  if (!secret) return null;
  const issuedAt = Date.now();
  const signature = crypto.createHmac("sha256", secret).update(`${userId}:${issuedAt}`).digest("hex");
  return `${userId}.${issuedAt}.${signature}`;
}

export type ParsedSession = { userId: string; issuedAt: Date };

/**
 * Checks the signature and the age only. Revocation needs the account's
 * `sessions_valid_from`, so callers should use `getSessionUser` from lib/users
 * rather than this directly.
 */
export function parseUserSessionToken(token: string | undefined): ParsedSession | null {
  const secret = getSessionSecret();
  if (!secret || !token) return null;

  const [userId, issuedAtRaw, signature] = token.split(".");
  if (!userId || !issuedAtRaw || !signature) return null;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return null;

  const expected = crypto.createHmac("sha256", secret).update(`${userId}:${issuedAt}`).digest("hex");
  if (!timingSafeStringEqual(expected, signature)) return null;

  // Reject expired and implausibly future-dated tokens.
  const age = Date.now() - issuedAt;
  if (age > SESSION_MAX_AGE_MS || age < -60_000) return null;

  return { userId, issuedAt: new Date(issuedAt) };
}
