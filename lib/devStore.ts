/**
 * Local development data store.
 *
 * When Supabase credentials are absent, the whole app falls back to this JSON-file
 * store so events, registrations, and accounts can be exercised end-to-end locally.
 * It is never used when SUPABASE_SERVICE_ROLE_KEY is set, so production always talks
 * to Postgres. Data lives in .data/dev-db.json (gitignored).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Event, EventInput } from "@/lib/events";

const DB_FILE = path.join(process.cwd(), ".data", "dev-db.json");

export type DevRegistration = {
  id: string;
  event_id: string;
  ticket_tier_id: string | null;
  charged_price: number | null;
  name: string;
  email: string;
  phone: string;
  strava_handle: string | null;
  email_updates: boolean;
  payment_status: "pending" | "paid" | "failed";
  razorpay_order_id: string | null;
  payment_id: string | null;
  user_id: string | null;
  registration_code: string;
  created_at: string;
};

export type DevUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  created_at: string;
};

type DevDb = { events: Event[]; registrations: DevRegistration[]; users: DevUser[] };

/** True when Supabase is not configured, so the local store should be used instead. */
export function isDevStoreEnabled() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function readDb(): DevDb {
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Partial<DevDb>;
    return { events: parsed.events ?? [], registrations: parsed.registrations ?? [], users: parsed.users ?? [] };
  } catch {
    return { events: [], registrations: [], users: [] };
  }
}

function writeDb(db: DevDb) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function slugifyTitle(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "event";
}

function uniqueSlug(db: DevDb, title: string, excludeEventId?: string) {
  const base = slugifyTitle(title);
  let candidate = base;
  let suffix = 1;
  while (db.events.some((event) => event.slug === candidate && event.id !== excludeEventId)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

function toEvent(input: EventInput, id: string, slug: string, createdAt: string): Event {
  return {
    id,
    slug,
    title: input.title,
    description: input.description,
    banner_image_url: input.banner_image_url,
    date: input.date,
    location: input.location,
    price: input.price,
    capacity: input.capacity,
    event_type: input.event_type,
    is_active: input.is_active,
    created_at: createdAt,
    ticket_tiers: input.ticket_tiers.map((tier) => ({ ...tier, id: crypto.randomUUID() })),
  };
}

/* ---------- events ---------- */

export function devGetAllEvents(): Event[] {
  return readDb().events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function devGetUpcomingEvents(limit?: number): Event[] {
  const now = Date.now();
  const events = readDb()
    .events.filter((event) => event.is_active && new Date(event.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return limit ? events.slice(0, limit) : events;
}

export function devGetUpcomingEventBySlug(slug: string): Event | null {
  return devGetUpcomingEvents().find((event) => event.slug === slug) ?? null;
}

export function devGetEventById(id: string): Event | null {
  return readDb().events.find((event) => event.id === id) ?? null;
}

export function devCreateEvent(input: EventInput) {
  const db = readDb();
  const slug = uniqueSlug(db, input.title);
  db.events.push(toEvent(input, crypto.randomUUID(), slug, new Date().toISOString()));
  writeDb(db);
}

export function devUpdateEvent(id: string, input: EventInput) {
  const db = readDb();
  const index = db.events.findIndex((event) => event.id === id);
  if (index === -1) return { error: "Event not found." };
  const slug = uniqueSlug(db, input.title, id);
  db.events[index] = toEvent(input, id, slug, db.events[index].created_at);
  writeDb(db);
  return {};
}

export function devSetEventActive(id: string, isActive: boolean) {
  const db = readDb();
  const event = db.events.find((item) => item.id === id);
  if (!event) return { error: "Event not found." };
  event.is_active = isActive;
  writeDb(db);
  return {};
}

export function devDeleteEvent(id: string) {
  const db = readDb();
  if (db.registrations.some((registration) => registration.event_id === id)) {
    return { error: "This event has registrations and cannot be deleted. Deactivate it instead." };
  }
  db.events = db.events.filter((event) => event.id !== id);
  writeDb(db);
  return {};
}

/* ---------- registrations ---------- */

export function devCreateRegistration(input: Omit<DevRegistration, "id" | "created_at" | "razorpay_order_id" | "payment_id">) {
  const db = readDb();
  const registration: DevRegistration = { ...input, id: crypto.randomUUID(), razorpay_order_id: null, payment_id: null, created_at: new Date().toISOString() };
  db.registrations.push(registration);
  writeDb(db);
  return registration;
}

export function devGetRegistrationById(id: string): DevRegistration | null {
  return readDb().registrations.find((registration) => registration.id === id) ?? null;
}

export function devGetAllRegistrations(): DevRegistration[] {
  return readDb().registrations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function devGetRegistrationsByUser(userId: string): DevRegistration[] {
  return devGetAllRegistrations().filter((registration) => registration.user_id === userId);
}

export function devSetRegistrationPaid(id: string, paymentId: string | null) {
  const db = readDb();
  const registration = db.registrations.find((item) => item.id === id);
  if (!registration) return;
  registration.payment_status = "paid";
  registration.payment_id = paymentId;
  writeDb(db);
}

/** Attaches the Razorpay order/payment ids to a registration after verification. */
export function devSetRegistrationPaymentRefs(id: string, orderId: string | null, paymentId: string | null) {
  const db = readDb();
  const registration = db.registrations.find((item) => item.id === id);
  if (!registration) return;
  registration.razorpay_order_id = orderId;
  registration.payment_id = paymentId;
  writeDb(db);
}

export function devFindTierName(eventId: string, tierId: string | null) {
  if (!tierId) return null;
  const event = devGetEventById(eventId);
  return event?.ticket_tiers?.find((tier) => tier.id === tierId)?.name ?? null;
}

/* ---------- users ---------- */

export function devFindUserByEmailOrPhone(identifier: string): DevUser | null {
  const db = readDb();
  const key = identifier.includes("@") ? "email" : "phone";
  return db.users.find((user) => user[key] === identifier) ?? null;
}

export function devGetUserById(id: string): DevUser | null {
  return readDb().users.find((user) => user.id === id) ?? null;
}

export function devCreateUser(input: { name: string; email: string; phone: string; password_hash: string }) {
  const db = readDb();
  if (db.users.some((user) => user.email === input.email)) return { error: "An account with this email already exists." };
  if (db.users.some((user) => user.phone === input.phone)) return { error: "An account with this phone number already exists." };
  const user: DevUser = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  db.users.push(user);
  writeDb(db);
  return { user };
}

export function devUpdateUser(id: string, patch: { name: string; email: string; phone: string; password_hash?: string }) {
  const db = readDb();
  const user = db.users.find((item) => item.id === id);
  if (!user) return { error: "Account not found." };
  if (db.users.some((item) => item.id !== id && item.email === patch.email)) return { error: "An account with this email already exists." };
  if (db.users.some((item) => item.id !== id && item.phone === patch.phone)) return { error: "An account with this phone number already exists." };
  user.name = patch.name;
  user.email = patch.email;
  user.phone = patch.phone;
  if (patch.password_hash) user.password_hash = patch.password_hash;
  writeDb(db);
  return { user };
}
