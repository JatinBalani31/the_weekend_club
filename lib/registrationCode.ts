import crypto from "node:crypto";

export const REGISTRATION_CODE_PREFIX = "TWC";
const REGISTRATION_NUMBER_MIN = 0;
const REGISTRATION_NUMBER_COUNT = 1000;

/** Generates a random attendee-facing code, e.g. "TWC-0428". */
export function generateRegistrationCode() {
  return `${REGISTRATION_CODE_PREFIX}-${String(REGISTRATION_NUMBER_MIN + crypto.randomInt(REGISTRATION_NUMBER_COUNT)).padStart(4, "0")}`;
}

/** Selects an unused code, returning null after all 1,000 values are allocated. */
export function generateAvailableRegistrationCode(usedCodes: ReadonlySet<string>) {
  const available: string[] = [];
  for (let number = REGISTRATION_NUMBER_MIN; number < REGISTRATION_NUMBER_MIN + REGISTRATION_NUMBER_COUNT; number += 1) {
    const code = `${REGISTRATION_CODE_PREFIX}-${String(number).padStart(4, "0")}`;
    if (!usedCodes.has(code)) available.push(code);
  }
  return available.length > 0 ? available[crypto.randomInt(available.length)] : null;
}

/** Stable fallback for rows created before registration codes existed. */
export function registrationCodeFromId(id: string) {
  const digest = crypto.createHash("sha256").update(id).digest();
  return `${REGISTRATION_CODE_PREFIX}-${String(REGISTRATION_NUMBER_MIN + (digest.readUInt32BE(0) % REGISTRATION_NUMBER_COUNT)).padStart(4, "0")}`;
}
