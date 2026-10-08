import { getSupabaseAdminClient, getSupabaseClient } from "@/lib/supabase";
import {
  devCreateEvent,
  devDeleteEvent,
  devGetAllEvents,
  devGetUpcomingEventBySlug,
  devGetUpcomingEvents,
  devSetEventActive,
  devUpdateEvent,
  isDevStoreEnabled,
} from "@/lib/devStore";

export type EventType = "run" | "workshop" | "music";

export type Event = {
  id: string;
  title: string;
  slug: string;
  description: string;
  banner_image_url: string;
  date: string;
  location: string;
  price: number;
  capacity: number;
  event_type: EventType;
  is_active: boolean;
  route_description?: string | null;
  route_url?: string | null;
  route_image_url?: string | null;
  created_at: string;
  ticket_tiers?: TicketTier[];
};

export type TicketTier = {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sale_ends_at: string | null;
  is_active: boolean;
};

export type TicketTierInput = {
  name: string;
  price: number;
  capacity: number;
  sale_ends_at: string | null;
  is_active: boolean;
};

export type EventInput = {
  title: string;
  description: string;
  banner_image_url: string;
  date: string;
  location: string;
  price: number;
  capacity: number;
  event_type: EventType;
  is_active: boolean;
  route_description: string | null;
  route_url: string | null;
  route_image_url: string | null;
  ticket_tiers: TicketTierInput[];
};

const BASE_EVENT_FIELDS = "id, title, slug, description, banner_image_url, date, location, price, capacity, event_type, is_active, created_at, ticket_tiers(id, name, price, capacity, sale_ends_at, is_active)";

function withoutRunDetails(event: Event): Event {
  const publicEvent = { ...event };
  delete publicEvent.route_description;
  delete publicEvent.route_url;
  delete publicEvent.route_image_url;
  return publicEvent;
}

export async function getUpcomingEvents(limit?: number): Promise<Event[]> {
  if (isDevStoreEnabled()) return devGetUpcomingEvents(limit).map(withoutRunDetails);

  const supabase = getSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("events")
    .select(BASE_EVENT_FIELDS)
    .eq("is_active", true)
    .gt("date", new Date().toISOString())
    .order("date", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("Unable to load upcoming events", error);
    return [];
  }

  return (data ?? []) as unknown as Event[];
}

export async function getUpcomingEventBySlug(slug: string): Promise<Event | null> {
  if (isDevStoreEnabled()) {
    const event = devGetUpcomingEventBySlug(slug);
    return event ? withoutRunDetails(event) : null;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("events")
    .select(BASE_EVENT_FIELDS)
    .eq("slug", slug)
    .eq("is_active", true)
    .gt("date", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error("Unable to load event", error);
    return null;
  }

  return data as unknown as Event | null;
}

export async function getAllEventsAdmin(): Promise<Event[]> {
  if (isDevStoreEnabled()) return devGetAllEvents();

  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("events")
    .select(BASE_EVENT_FIELDS)
    .order("date", { ascending: false });

  if (error) {
    console.error("Unable to load events for admin", error);
    return [];
  }

  const events = (data ?? []) as unknown as Event[];
  if (events.length === 0) return events;

  const { data: routeDetails, error: routeDetailsError } = await supabase
    .from("event_run_details")
    .select("event_id, route_description, route_url, route_image_path")
    .in("event_id", events.map((event) => event.id));

  if (routeDetailsError) {
    console.error("Unable to load run details for admin", routeDetailsError);
    return events;
  }

  const detailsByEventId = new Map((routeDetails ?? []).map((details) => [details.event_id, details]));
  return events.map((event) => {
    const details = detailsByEventId.get(event.id);
    return {
      ...event,
      route_description: details?.route_description ?? null,
      route_url: details?.route_url ?? null,
      route_image_url: details?.route_image_path ?? null,
    };
  });
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "event";
}

async function findAvailableSlug(supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, title: string, excludeEventId?: string) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 1;
  for (;;) {
    let query = supabase.from("events").select("id").eq("slug", candidate);
    if (excludeEventId) query = query.neq("id", excludeEventId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export async function createEventWithTiers(input: EventInput): Promise<{ event?: Event; error?: string }> {
  if (isDevStoreEnabled()) { devCreateEvent(input); return {}; }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Events are not configured yet." };

  const slug = await findAvailableSlug(supabase, input.title);
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      title: input.title,
      slug,
      description: input.description,
      banner_image_url: input.banner_image_url,
      date: input.date,
      location: input.location,
      price: input.price,
      capacity: input.capacity,
      event_type: input.event_type,
      is_active: input.is_active,
    })
    .select("id")
    .single();

  if (error || !event) {
    console.error("Unable to create event", error);
    return { error: "Could not create the event." };
  }

  if (input.ticket_tiers.length > 0) {
    const { error: tiersError } = await supabase.from("ticket_tiers").insert(input.ticket_tiers.map((tier) => ({ ...tier, event_id: event.id })));
    if (tiersError) {
      console.error("Unable to create ticket tiers", tiersError);
      return { error: "Event was created, but ticket tiers could not be saved." };
    }
  }

  return {};
}

export async function updateEventWithTiers(id: string, input: EventInput): Promise<{ error?: string }> {
  if (isDevStoreEnabled()) return devUpdateEvent(id, input);

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Events are not configured yet." };

  const slug = await findAvailableSlug(supabase, input.title, id);
  const { error } = await supabase
    .from("events")
    .update({
      title: input.title,
      slug,
      description: input.description,
      banner_image_url: input.banner_image_url,
      date: input.date,
      location: input.location,
      price: input.price,
      capacity: input.capacity,
      event_type: input.event_type,
      is_active: input.is_active,
    })
    .eq("id", id);

  if (error) {
    console.error("Unable to update event", error);
    return { error: "Could not update the event." };
  }

  const runDetails = {
    event_id: id,
    route_description: input.route_description,
    route_url: input.route_url,
    route_image_path: input.route_image_url,
    updated_at: new Date().toISOString(),
  };
  const hasRunDetails = runDetails.route_description || runDetails.route_url || runDetails.route_image_path;
  const { error: runDetailsError } = hasRunDetails
    ? await supabase.from("event_run_details").upsert(runDetails)
    : await supabase.from("event_run_details").delete().eq("event_id", id);

  if (runDetailsError) {
    console.error("Unable to save event run details", runDetailsError);
    return { error: "Event details were saved, but run details could not be updated. Check that the run-details migrations are applied." };
  }

  const { error: deleteError } = await supabase.from("ticket_tiers").delete().eq("event_id", id);
  if (deleteError) {
    console.error("Unable to replace ticket tiers", deleteError);
    return { error: "Event details were saved, but ticket tiers could not be updated." };
  }

  if (input.ticket_tiers.length > 0) {
    const { error: tiersError } = await supabase.from("ticket_tiers").insert(input.ticket_tiers.map((tier) => ({ ...tier, event_id: id })));
    if (tiersError) {
      console.error("Unable to create ticket tiers", tiersError);
      return { error: "Event details were saved, but ticket tiers could not be updated." };
    }
  }

  return {};
}

export async function setEventActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  if (isDevStoreEnabled()) return devSetEventActive(id, isActive);

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Events are not configured yet." };

  const { error } = await supabase.from("events").update({ is_active: isActive }).eq("id", id);
  if (error) {
    console.error("Unable to update event status", error);
    return { error: "Could not update the event." };
  }
  return {};
}

export async function deleteEventIfEmpty(id: string): Promise<{ error?: string }> {
  if (isDevStoreEnabled()) return devDeleteEvent(id);

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { error: "Events are not configured yet." };

  const { count, error: countError } = await supabase.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", id);
  if (countError) {
    console.error("Unable to check registrations before delete", countError);
    return { error: "Could not verify existing registrations." };
  }
  if (count && count > 0) return { error: "This event has registrations and cannot be deleted. Deactivate it instead." };

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    console.error("Unable to delete event", error);
    return { error: "Could not delete the event." };
  }
  return {};
}
