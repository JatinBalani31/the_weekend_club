import { afterAll, describe, expect, it } from "vitest";
import { api, cleanupTestData, cookieFrom, testEmail, testPhone, BASE_URL } from "./helpers";

afterAll(cleanupTestData);

describe("signup", () => {
  it("creates an account and issues a session", async () => {
    const email = testEmail("signup");
    const { status, body, headers } = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Probe Signup", email, phone: testPhone(), password: "weekend2026" }),
    });

    expect(status).toBe(200);
    expect(body.authenticated).toBe(true);
    const cookie = cookieFrom(headers, "user_session");
    expect(cookie).not.toBe("");

    // The session must actually resolve, not just be handed out.
    const account = await fetch(`${BASE_URL}/account`, { headers: { cookie }, redirect: "manual" });
    expect(account.status).toBe(200);
  });

  it("rejects a password under 8 characters", async () => {
    const { status } = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Short", email: testEmail("short"), phone: testPhone(), password: "abc123" }),
    });
    expect(status).toBe(400);
  });

  it("rejects passwords from the common-password deny list", async () => {
    // These are what credential stuffing tries first.
    for (const password of ["password123", "P@ssw0rd", "welcome123"]) {
      const { status, body } = await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: "Weak", email: testEmail("weak"), phone: testPhone(), password }),
      });
      expect(status, `expected ${password} to be rejected`).toBe(400);
      expect(String(body.error)).toMatch(/too common/i);
    }
  });

  it("rejects a malformed email or phone", async () => {
    const base = { name: "Bad", password: "weekend2026" };
    expect((await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ ...base, email: "nope", phone: testPhone() }) })).status).toBe(400);
    expect((await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ ...base, email: testEmail("badphone"), phone: "12345" }) })).status).toBe(400);
  });

  it("refuses a duplicate email", async () => {
    const email = testEmail("dupe");
    const first = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "First", email, phone: testPhone(), password: "weekend2026" }),
    });
    expect(first.status).toBe(200);

    const second = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Second", email, phone: testPhone(), password: "weekend2026" }),
    });
    expect(second.status).toBe(409);
  });
});

describe("login", () => {
  async function register() {
    const email = testEmail("login");
    const phone = testPhone();
    await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Login Probe", email, phone, password: "weekend2026" }),
    });
    return { email, phone };
  }

  it("signs in with email", async () => {
    const { email } = await register();
    const { status, headers } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: email, password: "weekend2026" }),
    });
    expect(status).toBe(200);
    expect(cookieFrom(headers, "user_session")).not.toBe("");
  });

  it("signs in with the phone number too", async () => {
    const { phone } = await register();
    const { status } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: phone, password: "weekend2026" }),
    });
    expect(status).toBe(200);
  });

  it("rejects a wrong password", async () => {
    const { email } = await register();
    const { status } = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: email, password: "wrong-password" }),
    });
    expect(status).toBe(401);
  });

  it("does not reveal whether an account exists", async () => {
    // Same message for unknown account and wrong password, so the endpoint
    // cannot be used to enumerate who has registered.
    const { email } = await register();
    const wrongPassword = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: email, password: "wrong-password" }),
    });
    const noSuchUser = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier: testEmail("ghost"), password: "wrong-password" }),
    });
    expect(wrongPassword.status).toBe(noSuchUser.status);
    expect(wrongPassword.body.error).toBe(noSuchUser.body.error);
  });
});

describe("protected pages", () => {
  it("redirects anonymous visitors away from /account", async () => {
    const response = await fetch(`${BASE_URL}/account`, { redirect: "manual" });
    expect([302, 307]).toContain(response.status);
  });

  it("refuses a forged session cookie", async () => {
    const response = await fetch(`${BASE_URL}/account`, {
      headers: { cookie: "user_session=11111111-1111-1111-1111-111111111111.9999999999999.deadbeef" },
      redirect: "manual",
    });
    expect([302, 307]).toContain(response.status);
  });
});
