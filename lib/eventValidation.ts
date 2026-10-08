import type { EventInput, EventType } from "@/lib/events";

const EVENT_TYPES: EventType[] = ["run", "workshop", "music"];

export function parseEventInput(payload: unknown): { input?: EventInput; error?: string } {
  if (typeof payload !== "object" || payload === null) return { error: "Invalid request body." };
  const body = payload as Record<string, unknown>;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const banner_image_url = typeof body.banner_image_url === "string" ? body.banner_image_url.trim() : "";
  const date = typeof body.date === "string" ? body.date : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (body.route_description !== undefined && typeof body.route_description !== "string") return { error: "Enter valid run details." };
  if (body.route_url !== undefined && typeof body.route_url !== "string") return { error: "Enter a valid route URL." };
  if (body.route_image_url !== undefined && typeof body.route_image_url !== "string") return { error: "Upload a valid route image." };
  const route_description = typeof body.route_description === "string" ? body.route_description.trim() : "";
  const rawRouteUrl = typeof body.route_url === "string" ? body.route_url.trim() : "";
  const route_image_url = typeof body.route_image_url === "string" ? body.route_image_url.trim() || null : null;
  const price = typeof body.price === "number" ? body.price : Number(body.price);
  const capacity = typeof body.capacity === "number" ? body.capacity : Number(body.capacity);
  const event_type = typeof body.event_type === "string" ? body.event_type : "";
  const is_active = body.is_active !== false;

  if (!title || !description || !banner_image_url || !location) return { error: "Fill in every event field." };
  if (route_description.length > 5000) return { error: "Run details must be 5,000 characters or fewer." };
  if (rawRouteUrl.length > 2048) return { error: "Route URL must be 2,048 characters or fewer." };
  if (route_image_url && (route_image_url.length > 2048 || !/^https:\/\//i.test(route_image_url))) return { error: "Upload a valid route image." };
  const route_url: string | null = rawRouteUrl || null;
  if (route_url) {
    try {
      const parsedUrl = new URL(route_url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) return { error: "Enter a valid route URL." };
    } catch {
      return { error: "Enter a valid route URL." };
    }
  }
  if (Number.isNaN(new Date(date).getTime())) return { error: "Choose a valid date and time." };
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price." };
  if (!Number.isFinite(capacity) || capacity <= 0) return { error: "Enter a valid capacity." };
  if (!EVENT_TYPES.includes(event_type as EventType)) return { error: "Choose a valid event type." };

  const rawTiers = Array.isArray(body.ticket_tiers) ? body.ticket_tiers : [];
  const ticket_tiers = [];
  for (const rawTier of rawTiers) {
    if (typeof rawTier !== "object" || rawTier === null) return { error: "Check the ticket tier details." };
    const tier = rawTier as Record<string, unknown>;
    const name = typeof tier.name === "string" ? tier.name.trim() : "";
    const tierPrice = typeof tier.price === "number" ? tier.price : Number(tier.price);
    const tierCapacity = typeof tier.capacity === "number" ? tier.capacity : Number(tier.capacity);
    const saleEndsAt = typeof tier.sale_ends_at === "string" && tier.sale_ends_at ? tier.sale_ends_at : null;
    const tierIsActive = tier.is_active !== false;
    if (!name) return { error: "Every ticket tier needs a name." };
    if (!Number.isFinite(tierPrice) || tierPrice < 0) return { error: "Enter a valid ticket tier price." };
    if (!Number.isFinite(tierCapacity) || tierCapacity <= 0) return { error: "Enter a valid ticket tier capacity." };
    if (saleEndsAt && Number.isNaN(new Date(saleEndsAt).getTime())) return { error: "Enter a valid ticket tier sale end date." };
    ticket_tiers.push({ name, price: tierPrice, capacity: tierCapacity, sale_ends_at: saleEndsAt, is_active: tierIsActive });
  }

  return { input: { title, description, banner_image_url, date: new Date(date).toISOString(), location, price, capacity, event_type: event_type as EventType, is_active, route_description: route_description || null, route_url, route_image_url, ticket_tiers } };
}
