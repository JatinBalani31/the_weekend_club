import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api, cleanupTestData, cookieFrom, createEvent, testEmail, testPhone, visibleText, BASE_URL, resetRateLimits } from "./helpers";

beforeAll(resetRateLimits);
afterAll(cleanupTestData);

describe("public pages render", () => {
  const pages: Array<[string, string]> = [
    ["/", "the Weekend Club"],
    ["/events", "Show up"],
    ["/login", "Log in"],
    ["/signup", "Create an account"],
    ["/admin", "Admin access"],
  ];

  it.each(pages)("%s returns 200 and renders its content", async (path, marker) => {
    const response = await fetch(`${BASE_URL}${path}`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(marker);
  });

  it("returns 404 for an unknown event", async () => {
    const response = await fetch(`${BASE_URL}/events/no-such-event-anywhere`, { redirect: "manual" });
    expect(response.status).toBe(404);
  });

  it("serves the dark theme and the self-hosted fonts", async () => {
    const html = await fetch(`${BASE_URL}/`).then((r) => r.text());
    // next/font emits hashed class names rather than the raw CSS variable, so
    // assert on what actually reaches the body.
    expect(html).toMatch(/<body[^>]*class="[^"]*__variable_[^"]*"/);
    expect(html).toMatch(/<body[^>]*class="[^"]*bg-bg[^"]*"/);
    expect(html).toMatch(/<body[^>]*class="[^"]*font-body[^"]*"/);
  });
});

describe("secrets never reach the browser", () => {
  it("keeps server-only values out of served HTML", async () => {
    const serverOnly = [
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.RAZORPAY_KEY_SECRET,
      process.env.ADMIN_PASSWORD,
      process.env.SESSION_SECRET,
      process.env.RAZORPAY_WEBHOOK_SECRET,
    ].filter((value): value is string => Boolean(value && value.length > 8));

    for (const path of ["/", "/events", "/login", "/signup", "/admin"]) {
      const html = await fetch(`${BASE_URL}${path}`).then((r) => r.text());
      for (const secret of serverOnly) {
        expect(html.includes(secret), `secret leaked on ${path}`).toBe(false);
      }
    }
  });
});

describe("logged-in visitor journey", () => {
  it("registers, sees the event in the account, and gets a pass", async () => {
    const email = testEmail("journey");
    const signup = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Journey Probe", email, phone: testPhone(), password: "weekend2026" }),
    });
    expect(signup.status).toBe(200);
    const cookie = cookieFrom(signup.headers, "user_session");

    const event = await createEvent({ price: 0 });

    // The form prefills from the session, so the register page should already
    // contain the account's details.
    const registerPage = await fetch(`${BASE_URL}/register/${event.slug}`, { headers: { cookie } }).then((r) => r.text());
    expect(registerPage).toContain(email);

    const registration = await api("/api/registrations", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ eventSlug: event.slug, name: "Journey Probe", email, phone: testPhone() }),
    });
    expect(registration.status).toBe(201);

    // It must show up under the visitor's own account, with a code and QR.
    const account = await fetch(`${BASE_URL}/account`, { headers: { cookie } }).then((r) => r.text());
    expect(account).toContain(event.title);
    expect(account).toMatch(/TWC-[A-Z2-9]{6}/);
    expect(account).toContain("data:image/png;base64");
  });

  it("does not show one visitor's registrations to another", async () => {
    const event = await createEvent({ price: 0 });

    const aEmail = testEmail("tenant-a");
    const a = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Tenant A", email: aEmail, phone: testPhone(), password: "weekend2026" }),
    });
    const aCookie = cookieFrom(a.headers, "user_session");
    await api("/api/registrations", {
      method: "POST",
      headers: { cookie: aCookie },
      body: JSON.stringify({ eventSlug: event.slug, name: "Tenant A", email: aEmail, phone: testPhone() }),
    });

    const bEmail = testEmail("tenant-b");
    const b = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: "Tenant B", email: bEmail, phone: testPhone(), password: "weekend2026" }),
    });
    const bCookie = cookieFrom(b.headers, "user_session");

    const bAccount = await fetch(`${BASE_URL}/account`, { headers: { cookie: bCookie } }).then((r) => r.text());
    expect(bAccount).not.toContain(aEmail);
    expect(visibleText(bAccount)).toContain("0 registrations");
  });
});
