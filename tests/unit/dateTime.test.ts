import { describe, expect, it } from "vitest";
import {
  eventCardDateFormatter,
  eventDateTimeFormatter,
  istDatetimeLocalToUtcIso,
  utcIsoToIstDatetimeLocal,
} from "@/lib/dateTime";

describe("event times are pinned to IST", () => {
  it("stores 7:00 AM IST as 01:30 UTC", () => {
    // The exact case that was reported: entered 7:00 AM, displayed 1:30 PM.
    expect(istDatetimeLocalToUtcIso("2026-09-06T07:00")).toBe("2026-09-06T01:30:00.000Z");
  });

  it("displays a stored time as the IST wall clock that was entered", () => {
    const stored = istDatetimeLocalToUtcIso("2026-09-06T07:00");
    expect(eventDateTimeFormatter.format(new Date(stored))).toContain("7:00 am");
  });

  it("round-trips through the edit form without drifting", () => {
    for (const entered of ["2026-09-06T07:00", "2026-01-01T00:00", "2026-12-31T23:59", "2027-06-15T12:30"]) {
      expect(utcIsoToIstDatetimeLocal(istDatetimeLocalToUtcIso(entered))).toBe(entered);
    }
  });

  it("crosses midnight correctly", () => {
    // 00:30 IST is the previous day in UTC - the case a naive offset gets wrong.
    expect(istDatetimeLocalToUtcIso("2026-09-06T00:30")).toBe("2026-09-05T19:00:00.000Z");
    expect(utcIsoToIstDatetimeLocal("2026-09-05T19:00:00.000Z")).toBe("2026-09-06T00:30");
  });

  it("formats the date the same regardless of the machine's timezone", () => {
    // The original bug: no timeZone set, so Vercel's UTC runtime shifted the
    // clock. Formatters must be immune to the host timezone.
    const stored = istDatetimeLocalToUtcIso("2026-09-06T07:00");
    const original = process.env.TZ;
    const rendered: string[] = [];
    for (const timeZone of ["UTC", "America/Los_Angeles", "Asia/Kolkata", "Australia/Sydney"]) {
      process.env.TZ = timeZone;
      rendered.push(eventDateTimeFormatter.format(new Date(stored)));
      rendered.push(eventCardDateFormatter.format(new Date(stored)));
    }
    process.env.TZ = original;

    const times = rendered.filter((value) => value.includes(":"));
    const dates = rendered.filter((value) => !value.includes(":"));
    expect(new Set(times).size).toBe(1);
    expect(new Set(dates).size).toBe(1);
    expect(times[0]).toContain("7:00 am");
  });

  it("keeps the IST date when UTC has already rolled over", () => {
    // 01:30 UTC on the 6th is still the 6th in IST; a UTC-based card would be
    // right here but wrong for anything before 05:30 IST.
    const stored = "2026-09-06T01:30:00.000Z";
    expect(eventCardDateFormatter.format(new Date(stored))).toContain("6");
    // 22:00 IST on the 6th is 16:30 UTC - same day. 01:00 IST on the 7th is
    // 19:30 UTC on the 6th, and must still read as the 7th.
    expect(eventCardDateFormatter.format(new Date(istDatetimeLocalToUtcIso("2026-09-07T01:00")))).toContain("7");
  });
});
