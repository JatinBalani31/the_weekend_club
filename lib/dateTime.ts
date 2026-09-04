/**
 * Every event time in this app is India-local. India has a single, fixed
 * UTC+5:30 offset with no daylight saving, so a constant is correct and never
 * needs a timezone database.
 *
 * Before this file existed, saving used `new Date(datetimeLocalString)` (parsed
 * in whatever timezone the admin's own browser happened to be in) and display
 * used `Intl.DateTimeFormat` with no `timeZone` (rendered in whatever timezone
 * the Node process happened to be in - UTC on Vercel). Neither step was pinned
 * to India, so the wall-clock time drifted depending on where the browser or
 * the server happened to be. Admin entered 7:00 AM and a visitor a timezone
 * away saw something else entirely.
 */
export const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Turns a `<input type="datetime-local">` value (e.g. "2026-09-06T07:00"),
 * always entered as IST wall-clock time, into the correct UTC ISO string to
 * store - regardless of what timezone the admin's browser reports itself in.
 */
export function istDatetimeLocalToUtcIso(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return new Date(value).toISOString();

  const [, year, month, day, hour, minute, second] = match;
  const utcMs =
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second ?? "0")) -
    IST_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

/**
 * The reverse, for prefilling a datetime-local input from a stored UTC ISO
 * string: always renders the IST wall-clock time, regardless of what timezone
 * the admin's browser reports itself in.
 */
export function utcIsoToIstDatetimeLocal(isoUtc: string): string {
  const shifted = new Date(new Date(isoUtc).getTime() + IST_OFFSET_MS);
  return shifted.toISOString().slice(0, 16);
}

/**
 * Formatters for public-facing event times. All pin `timeZone: IST_TIME_ZONE`
 * explicitly, so the displayed wall-clock time is always India time no matter
 * where the rendering server happens to run.
 */
export const eventDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: IST_TIME_ZONE,
});

export const eventDateTimeShortFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: IST_TIME_ZONE,
});

export const eventCardDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  weekday: "short",
  timeZone: IST_TIME_ZONE,
});
