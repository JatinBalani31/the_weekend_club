import { describe, expect, it, beforeAll } from "vitest";
import {
  createUserSessionToken,
  hashPassword,
  parseUserSessionToken,
  verifyPassword,
  SESSION_MAX_AGE_MS,
} from "@/lib/userAuth";

beforeAll(() => {
  process.env.SESSION_SECRET ||= "test-secret-for-unit-tests-only-0123456789";
});

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const stored = await hashPassword("weekend2026");
    expect(await verifyPassword("weekend2026", stored)).toBe(true);
    expect(await verifyPassword("weekend2027", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("never stores the password itself", async () => {
    const stored = await hashPassword("weekend2026");
    expect(stored).not.toContain("weekend2026");
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const [a, b] = [await hashPassword("same-password"), await hashPassword("same-password")];
    expect(a).not.toBe(b);
    // Both must still verify - a rainbow table over one hash cannot cover both.
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", async () => {
    for (const malformed of ["", "nosalt", "::", "abc:"]) {
      expect(await verifyPassword("x", malformed)).toBe(false);
    }
  });
});

describe("session tokens", () => {
  const userId = "11111111-2222-3333-4444-555555555555";

  it("round-trips a freshly issued token", () => {
    const parsed = parseUserSessionToken(createUserSessionToken(userId)!);
    expect(parsed?.userId).toBe(userId);
  });

  it("rejects a tampered user id", () => {
    const token = createUserSessionToken(userId)!;
    const [, issuedAt, signature] = token.split(".");
    // Swapping in another user's id must not authenticate as them.
    const forged = `99999999-2222-3333-4444-555555555555.${issuedAt}.${signature}`;
    expect(parseUserSessionToken(forged)).toBeNull();
  });

  it("rejects a tampered issue time", () => {
    const token = createUserSessionToken(userId)!;
    const [id, , signature] = token.split(".");
    // Back-dating or extending a token must invalidate the signature.
    expect(parseUserSessionToken(`${id}.${Date.now() + 60_000}.${signature}`)).toBeNull();
  });

  it("rejects a forged signature", () => {
    const token = createUserSessionToken(userId)!;
    const [id, issuedAt] = token.split(".");
    expect(parseUserSessionToken(`${id}.${issuedAt}.${"a".repeat(64)}`)).toBeNull();
  });

  it("rejects malformed and empty tokens", () => {
    for (const bad of [undefined, "", "a", "a.b", "a.b.c.d", "...."]) {
      expect(parseUserSessionToken(bad as string | undefined)).toBeNull();
    }
  });

  it("expires a token older than the maximum age", () => {
    const expiredIssuedAt = Date.now() - SESSION_MAX_AGE_MS - 1000;
    const crypto = require("node:crypto");
    const signature = crypto
      .createHmac("sha256", process.env.SESSION_SECRET!)
      .update(`${userId}:${expiredIssuedAt}`)
      .digest("hex");
    // Correctly signed, but too old: the server must refuse it regardless of
    // what the cookie's own expiry says, since the client controls that.
    expect(parseUserSessionToken(`${userId}.${expiredIssuedAt}.${signature}`)).toBeNull();
  });

  it("rejects a token dated far in the future", () => {
    const crypto = require("node:crypto");
    const future = Date.now() + 10 * 60_000;
    const signature = crypto
      .createHmac("sha256", process.env.SESSION_SECRET!)
      .update(`${userId}:${future}`)
      .digest("hex");
    expect(parseUserSessionToken(`${userId}.${future}.${signature}`)).toBeNull();
  });
});
