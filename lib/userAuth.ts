import crypto from "node:crypto";

const COOKIE_NAME = "user_session";
const SCRYPT_KEY_LENGTH = 64;

function timingSafeStringEqual(expected: string, value: string) {
  const expectedBuffer = Buffer.from(expected);
  const valueBuffer = Buffer.from(value);
  return expectedBuffer.length === valueBuffer.length && crypto.timingSafeEqual(expectedBuffer, valueBuffer);
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return timingSafeStringEqual(hash, candidate);
}

export function getUserCookieName() {
  return COOKIE_NAME;
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || null;
}

export function createUserSessionToken(userId: string) {
  const secret = getSessionSecret();
  if (!secret) return null;
  const signature = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  return `${userId}.${signature}`;
}

export function getUserIdFromSessionToken(token: string | undefined) {
  const secret = getSessionSecret();
  if (!secret || !token) return null;
  const [userId, signature] = token.split(".");
  if (!userId || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(userId).digest("hex");
  return timingSafeStringEqual(expected, signature) ? userId : null;
}
