/**
 * Shared parsing for a registration form submission.
 *
 * Used both when a registration is created directly (free events) and when it is
 * reconstructed from a Razorpay order's notes after payment, so the two paths
 * cannot drift apart in what they accept.
 */
export type RegistrationInput = {
  eventSlug: string;
  name: string;
  email: string;
  phone: string;
  stravaHandle: string | null;
  ticketTierId: string | null;
  emailUpdates: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

export function parseRegistrationInput(payload: unknown): { input?: RegistrationInput; error?: string } {
  if (typeof payload !== "object" || payload === null) return { error: "Invalid request body." };
  const body = payload as Record<string, unknown>;

  const eventSlug = typeof body.eventSlug === "string" ? body.eventSlug : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.replace(/[\s-]/g, "") : "";
  const stravaHandle = typeof body.strava_handle === "string" ? body.strava_handle.trim() || null : null;
  const ticketTierId = typeof body.ticket_tier_id === "string" && body.ticket_tier_id ? body.ticket_tier_id : null;
  const emailUpdates = body.email_updates === true;

  if (!eventSlug || !name || !emailPattern.test(email) || !phonePattern.test(phone)) {
    return { error: "Please check the details you entered." };
  }

  return { input: { eventSlug, name, email, phone, stravaHandle, ticketTierId, emailUpdates } };
}

/**
 * Razorpay order notes hold the registration until payment succeeds - values
 * must be strings, and there is a 15-key limit.
 */
export function toOrderNotes(input: RegistrationInput, userId: string | null) {
  return {
    event_slug: input.eventSlug,
    name: input.name,
    email: input.email,
    phone: input.phone,
    strava_handle: input.stravaHandle ?? "",
    ticket_tier_id: input.ticketTierId ?? "",
    email_updates: input.emailUpdates ? "1" : "0",
    user_id: userId ?? "",
  };
}

export function fromOrderNotes(notes: Record<string, unknown> | undefined | null): {
  input?: RegistrationInput;
  userId?: string | null;
  error?: string;
} {
  if (!notes) return { error: "Payment order is missing its registration details." };

  const { input, error } = parseRegistrationInput({
    eventSlug: notes.event_slug,
    name: notes.name,
    email: notes.email,
    phone: notes.phone,
    strava_handle: notes.strava_handle,
    ticket_tier_id: notes.ticket_tier_id,
    email_updates: notes.email_updates === "1",
  });

  if (error || !input) return { error: error ?? "Payment order is missing its registration details." };
  return { input, userId: typeof notes.user_id === "string" && notes.user_id ? notes.user_id : null };
}
