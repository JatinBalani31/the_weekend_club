import { afterAll, describe, expect, it } from "vitest";
import { admin, adminSessionCookie, api, cleanupTestData, createEvent, TEST_MARKER, BASE_URL } from "./helpers";

afterAll(cleanupTestData);

describe("admin authentication", () => {
  it("rejects a wrong password", async () => {
    const { status } = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: "definitely-not-the-password" }),
    });
    expect([401, 429]).toContain(status);
  });

  it("accepts the configured password and issues a session", async () => {
    expect(await adminSessionCookie()).not.toBe("");
  });

  it("refuses admin APIs without a session", async () => {
    const { status } = await api("/api/admin/events");
    expect(status).toBe(401);
  });

  it("refuses a forged admin cookie", async () => {
    const { status } = await api("/api/admin/events", {
      headers: { cookie: "admin_session=9999999999999.deadbeefdeadbeef" },
    });
    expect(status).toBe(401);
  });
});

describe("admin creates an event", () => {
  it("creates it, and it appears publicly with the entered IST time", async () => {
    const cookie = await adminSessionCookie();
    const stamp = Date.now();

    // 7:00 AM IST - the exact case that previously displayed as 1:30 PM.
    const created = await api("/api/admin/events", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        title: `${TEST_MARKER} Sunrise ${stamp}`,
        description: "Created through the admin API by the integration suite.",
        banner_image_url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=60",
        date: "2030-03-17T01:30:00.000Z", // 07:00 IST
        location: "Cubbon Park, Bengaluru",
        price: 0,
        capacity: 25,
        event_type: "run",
        is_active: true,
        ticket_tiers: [],
      }),
    });
    expect(created.status).toBe(201);

    const supabase = admin();
    const { data: event } = await supabase
      .from("events")
      .select("id, slug, date, capacity")
      .eq("title", `${TEST_MARKER} Sunrise ${stamp}`)
      .single();
    expect(event).toBeTruthy();
    expect(new Date(event!.date).toISOString()).toBe("2030-03-17T01:30:00.000Z");

    // The public detail page must render the IST wall clock, not UTC.
    const page = await fetch(`${BASE_URL}/events/${event!.slug}`).then((r) => r.text());
    expect(page).toContain("7:00");
    expect(page).not.toContain("1:30 am");

    // And it must be listed.
    const list = await fetch(`${BASE_URL}/events`).then((r) => r.text());
    expect(list).toContain(`${TEST_MARKER} Sunrise ${stamp}`);

    await supabase.from("events").delete().eq("id", event!.id);
  });

  it("rejects an event with a missing field", async () => {
    const cookie = await adminSessionCookie();
    const { status } = await api("/api/admin/events", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ title: "", description: "x", location: "y" }),
    });
    expect(status).toBe(400);
  });
});

describe("event visibility", () => {
  it("hides a deactivated event from the public pages", async () => {
    const event = await createEvent({ is_active: false });
    const list = await fetch(`${BASE_URL}/events`).then((r) => r.text());
    expect(list).not.toContain(event.title);

    const detail = await fetch(`${BASE_URL}/events/${event.slug}`, { redirect: "manual" });
    expect(detail.status).toBe(404);
  });

  it("hides an event whose date has passed", async () => {
    const past = await createEvent({ date: "2020-01-01T01:30:00+00:00" });
    const list = await fetch(`${BASE_URL}/events`).then((r) => r.text());
    expect(list).not.toContain(past.title);
  });

  it("shows an active future event", async () => {
    const event = await createEvent();
    const list = await fetch(`${BASE_URL}/events`).then((r) => r.text());
    expect(list).toContain(event.title);
  });
});
