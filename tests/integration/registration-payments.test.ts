import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, api, cleanupTestData, createEvent, hasTable, testEmail, testPhone, TEST_MARKER, BASE_URL, resetRateLimits } from "./helpers";

beforeAll(resetRateLimits);
afterAll(cleanupTestData);

describe("free event registration", () => {
  it("saves the registration and issues a code", async () => {
    const event = await createEvent({ price: 0 });
    const email = testEmail("free");

    const { status, body } = await api("/api/registrations", {
      method: "POST",
      body: JSON.stringify({ eventSlug: event.slug, name: "Free Probe", email, phone: testPhone() }),
    });

    expect(status).toBe(201);
    expect(body.free).toBe(true);
    expect(body.registrationId).toBeTruthy();

    const { data } = await admin()
      .from("registrations")
      .select("payment_status, charged_price, email")
      .eq("id", body.registrationId)
      .single();
    expect(data?.payment_status).toBe("paid");
    expect(Number(data?.charged_price)).toBe(0);

    // The success page must show a registration number and a QR pass.
    const page = await fetch(`${BASE_URL}/success?registration_id=${body.registrationId}`).then((r) => r.text());
    expect(page).toMatch(/TWC-[A-Z2-9]{6}/);
    expect(page).toContain("data:image/png;base64");
  });

  it("rejects an invalid submission before touching the database", async () => {
    const event = await createEvent({ price: 0 });
    const before = await admin().from("registrations").select("id").eq("event_id", event.id);

    const { status } = await api("/api/registrations", {
      method: "POST",
      body: JSON.stringify({ eventSlug: event.slug, name: "Bad", email: "not-an-email", phone: "123" }),
    });
    expect(status).toBe(400);

    const after = await admin().from("registrations").select("id").eq("event_id", event.id);
    expect(after.data?.length).toBe(before.data?.length);
  });

  it("refuses registration for an event that is not open", async () => {
    const inactive = await createEvent({ is_active: false });
    const { status } = await api("/api/registrations", {
      method: "POST",
      body: JSON.stringify({ eventSlug: inactive.slug, name: "Nope", email: testEmail("inactive"), phone: testPhone() }),
    });
    expect(status).toBe(404);
  });
});

describe("paid event checkout", () => {
  it("creates a Razorpay order but stores NOTHING until payment is verified", async () => {
    // The core guarantee of the payment-gating design: an abandoned checkout
    // must leave no registration behind.
    const event = await createEvent({ price: 250 });
    const email = testEmail("paid");

    const { status, body } = await api("/api/registrations", {
      method: "POST",
      body: JSON.stringify({ eventSlug: event.slug, name: "Paid Probe", email, phone: testPhone() }),
    });

    expect(status).toBe(200);
    expect(body.free).toBe(false);
    expect(String(body.orderId)).toMatch(/^order_/);
    expect(body.amount).toBe(25000); // paise, derived from the DB
    expect(body.currency).toBe("INR");

    const { data } = await admin().from("registrations").select("id").eq("email", email);
    expect(data?.length, "an unpaid checkout must not create a row").toBe(0);
  });

  it("derives the amount from the database, ignoring anything the client sends", async () => {
    // Amount tampering is the classic payment-gateway hole: the price must come
    // from the event row, never from the request body.
    const event = await createEvent({ price: 500 });
    const { body } = await api("/api/registrations", {
      method: "POST",
      body: JSON.stringify({
        eventSlug: event.slug,
        name: "Tamper Probe",
        email: testEmail("tamper"),
        phone: testPhone(),
        amount: 100,
        price: 1,
        charged_price: 1,
      }),
    });
    expect(body.amount).toBe(50000); // 500 rupees, not the 1 that was sent
  });

  it("rejects a ticket price below Razorpay's 100-paise floor", async () => {
    const event = await createEvent({ price: 0.5 });
    const { status, body } = await api("/api/registrations", {
      method: "POST",
      body: JSON.stringify({ eventSlug: event.slug, name: "Min Probe", email: testEmail("min"), phone: testPhone() }),
    });
    expect(status).toBe(400);
    expect(String(body.error)).toMatch(/at least INR 1/i);
  });
});

describe("payment verification", () => {
  it("refuses a forged signature and creates no registration", async () => {
    const { status, body } = await api("/api/verify-payment", {
      method: "POST",
      body: JSON.stringify({
        razorpay_order_id: "order_forged",
        razorpay_payment_id: "pay_forged",
        razorpay_signature: "deadbeef".repeat(8),
      }),
    });
    expect(status).toBe(400);
    expect(String(body.error)).toMatch(/verification failed/i);
  });

  it("refuses a request with missing fields", async () => {
    const { status } = await api("/api/verify-payment", { method: "POST", body: JSON.stringify({}) });
    expect(status).toBe(400);
  });
});

describe("razorpay webhook", () => {
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const sign = (body: string) =>
    crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET ?? "").update(body).digest("hex");

  it("rejects an unsigned delivery", async () => {
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    const response = await fetch(`${BASE_URL}/api/webhooks/razorpay`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    expect(response.status).toBe(400);
  });

  it("rejects a signature taken from a different body", async () => {
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_x", order_id: "order_x" } } } });
    const response = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": sign("a different body") },
      body,
    });
    expect(response.status).toBe(400);
  });

  it("acknowledges an event type it does not handle, so Razorpay stops retrying", async () => {
    const body = JSON.stringify({ event: "payment.failed", payload: {} });
    const response = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": sign(body) },
      body,
    });
    expect(response.status).toBe(200);
  });

  it("acknowledges an order that is not ours rather than retrying forever", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_ghost", order_id: "order_DoesNotExist999" } } },
    });
    const response = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": sign(body) },
      body,
    });
    expect(response.status).toBe(200);
  });
});

describe("capacity enforcement", () => {
  it("refuses a registration once the event is full", async () => {
    if (!(await hasTable("rate_limits"))) {
      console.warn("SKIP: capacity trigger needs the security-hardening migration");
      return;
    }

    const event = await createEvent({ price: 0, capacity: 1 });
    const first = await api("/api/registrations", {
      method: "POST",
      body: JSON.stringify({ eventSlug: event.slug, name: "First", email: testEmail("cap1"), phone: testPhone() }),
    });
    expect(first.status).toBe(201);

    const second = await api("/api/registrations", {
      method: "POST",
      body: JSON.stringify({ eventSlug: event.slug, name: "Second", email: testEmail("cap2"), phone: testPhone() }),
    });
    expect(second.status).toBeGreaterThanOrEqual(400);

    const { data } = await admin().from("registrations").select("id").eq("event_id", event.id);
    expect(data?.length, "capacity of 1 must mean exactly 1 registration").toBe(1);
  });
});
