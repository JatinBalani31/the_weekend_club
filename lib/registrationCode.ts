import crypto from "node:crypto";

/**
 * Crockford-style alphabet: no 0/O/1/I so a code read off a phone screen and
 * typed in by hand at the check-in desk cannot be transcribed wrongly.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
export const REGISTRATION_CODE_PREFIX = "TWC";

/** Generates a short, human-readable registration number, e.g. "TWC-K4M2P9". */
export function generateRegistrationCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) code += ALPHABET[bytes[index] % ALPHABET.length];
  return `${REGISTRATION_CODE_PREFIX}-${code}`;
}

/**
 * Fallback for rows created before registration codes existed, so every
 * registration can still show a stable number. Derived from the row id, so it
 * is the same every time it is rendered.
 */
export function registrationCodeFromId(id: string) {
  const digest = crypto.createHash("sha256").update(id).digest();
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) code += ALPHABET[digest[index] % ALPHABET.length];
  return `${REGISTRATION_CODE_PREFIX}-${code}`;
}
