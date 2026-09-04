import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RATE_LIMITS } from "@/lib/rateLimit";
import { api, cleanupTestData, hasTable, resetRateLimits, BASE_URL } from "./helpers";

beforeAll(resetRateLimits);
afterAll(async () => {
  // Leave no counters behind, or the next run starts throttled.
  await resetRateLimits();
  await cleanupTestData();
});

describe("admin login throttling", () => {
  it("blocks once the attempt limit is reached, and says when to retry", async () => {
    if (!(await hasTable("rate_limits"))) {
      console.warn("SKIP: rate limiting needs the security-hardening migration");
      return;
    }

    const limit = RATE_LIMITS.adminLogin.max;
    const statuses: number[] = [];
    let retryAfter: string | null = null;

    // One past the limit, so the boundary itself is exercised.
    for (let attempt = 0; attempt < limit + 3; attempt += 1) {
      const response = await fetch(`${BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: `wrong-guess-${attempt}` }),
      });
      statuses.push(response.status);
      if (response.status === 429 && !retryAfter) retryAfter = response.headers.get("retry-after");
    }

    // The brute-force protection that did not exist before this migration:
    // previously all of these returned 401 and an attacker could keep going.
    expect(statuses).toContain(429);
    expect(statuses.filter((status) => status === 401).length).toBeLessThanOrEqual(limit);

    // A well-behaved client needs to know how long to back off.
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number(retryAfter)).toBeLessThanOrEqual(RATE_LIMITS.adminLogin.windowSeconds);
  });

  it("still lets the correct password through once the window is cleared", async () => {
    if (!(await hasTable("rate_limits"))) return;
    await resetRateLimits();

    const { status } = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
    });
    expect(status).toBe(200);
  });
});

describe("public limits are sized for shared connections", () => {
  it("allows a group signing up from one address", async () => {
    // A whole venue can share one IP behind CGNAT or event WiFi, so the public
    // limits must not lock out the sixth person to sign up at a run.
    expect(RATE_LIMITS.signup.max).toBeGreaterThanOrEqual(20);
    expect(RATE_LIMITS.registration.max).toBeGreaterThanOrEqual(40);
    expect(RATE_LIMITS.login.max).toBeGreaterThanOrEqual(20);
  });

  it("keeps admin login tight, since it guards every registration", () => {
    expect(RATE_LIMITS.adminLogin.max).toBeLessThanOrEqual(10);
  });
});
