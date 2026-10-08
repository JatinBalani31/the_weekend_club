import { describe, expect, it } from "vitest";
import { parseEventInput } from "@/lib/eventValidation";
import { formatRunDetailsEmailHtml, formatRunDetailsMessage } from "@/lib/runDetails";

const validEvent = {
  title: "Sunday Run",
  description: "A relaxed community run.",
  banner_image_url: "https://example.com/run.jpg",
  date: "2026-10-10T01:30:00.000Z",
  location: "Bengaluru",
  price: 0,
  capacity: 50,
  event_type: "run",
  is_active: true,
  ticket_tiers: [],
};

describe("event run-detail validation", () => {
  it("accepts and trims route details", () => {
    const { input, error } = parseEventInput({
      ...validEvent,
      route_description: "  Meet at the park entrance.  ",
      route_url: "  https://maps.google.com/?q=park  ",
    });

    expect(error).toBeUndefined();
    expect(input?.route_description).toBe("Meet at the park entrance.");
    expect(input?.route_url).toBe("https://maps.google.com/?q=park");
  });

  it("allows missing route details", () => {
    const { input, error } = parseEventInput(validEvent);

    expect(error).toBeUndefined();
    expect(input?.route_description).toBeNull();
    expect(input?.route_url).toBeNull();
  });

  it("rejects non-web route URLs and oversized notes", () => {
    expect(parseEventInput({ ...validEvent, route_url: "javascript:alert(1)" }).error).toBe("Enter a valid route URL.");
    expect(parseEventInput({ ...validEvent, route_url: 123 }).error).toBe("Enter a valid route URL.");
    expect(parseEventInput({ ...validEvent, route_description: 123 }).error).toBe("Enter valid run details.");
    expect(parseEventInput({ ...validEvent, route_description: "x".repeat(5001) }).error).toBe("Run details must be 5,000 characters or fewer.");
  });

  it("accepts uploaded route-image paths and signed storage URLs", () => {
    const path = "runs/123e4567-e89b-12d3-a456-426614174000.png";
    const signedUrl = `https://project.supabase.co/storage/v1/object/sign/route-images/${path}?token=example`;
    expect(parseEventInput({ ...validEvent, route_image_url: path }).input?.route_image_url).toBe(path);
    expect(parseEventInput({ ...validEvent, route_image_url: signedUrl }).input?.route_image_url).toBe(signedUrl);
  });

  it("rejects invalid route-image references", () => {
    expect(parseEventInput({ ...validEvent, route_image_url: "data:image/png;base64,abc" }).error).toBe("Upload a valid route image.");
    expect(parseEventInput({ ...validEvent, route_image_url: "https://project.supabase.co/storage/route.png" }).error).toBe("Upload a valid route image.");
    expect(parseEventInput({ ...validEvent, route_image_url: "runs/not-a-uuid.png" }).error).toBe("Upload a valid route image.");
  });
});

describe("run-detail email and share content", () => {
  it("includes attendee name, date, notes, and route URL", () => {
    const message = formatRunDetailsMessage({
      title: "Sunday Run",
      date: "2026-10-10T01:30:00.000Z",
      route_description: "Meet at the park entrance.",
      route_url: "https://maps.google.com/?q=park",
      route_image_url: "https://project.supabase.co/storage/route.png",
    }, "Asha");

    expect(message).toContain("Hi Asha,");
    expect(message).toContain("Sunday Run");
    expect(message).toContain("Meet at the park entrance.");
    expect(message).toContain("https://maps.google.com/?q=park");
    expect(message).toContain("https://project.supabase.co/storage/route.png");
    expect(message).toContain("Run date:");
  });

  it("embeds the screenshot in the email without allowing HTML injection", () => {
    const html = formatRunDetailsEmailHtml({
      title: "<Run>",
      date: "2026-10-10T01:30:00.000Z",
      route_description: "<script>alert(1)</script>",
      route_image_url: "https://project.supabase.co/storage/route.png?x=1&y=2",
    }, "Asha");

    expect(html).toContain('<img src="https://project.supabase.co/storage/route.png?x=1&amp;y=2"');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
});
