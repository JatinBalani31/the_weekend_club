import { describe, expect, it } from "vitest";
import { generateRegistrationCode, registrationCodeFromId } from "@/lib/registrationCode";

describe("registration codes", () => {
  it("looks like TWC-XXXXXX", () => {
    expect(generateRegistrationCode()).toMatch(/^TWC-[A-Z2-9]{6}$/);
  });

  it("omits characters that are misread when typed at check-in", () => {
    // No 0/O or 1/I, so a code read off a phone screen cannot be transcribed
    // into a different valid-looking one.
    const codes = Array.from({ length: 400 }, () => generateRegistrationCode().slice(4));
    expect(codes.join("")).not.toMatch(/[01OI]/);
  });

  it("does not repeat across a realistic number of registrations", () => {
    // 6 chars over a 32-char alphabet is ~1.07 billion combinations; 5000 draws
    // sits comfortably below the birthday-bound collision risk, but is not
    // exactly zero, so tolerate one collision rather than assert perfection.
    const codes = Array.from({ length: 5000 }, generateRegistrationCode);
    const unique = new Set(codes);
    expect(unique.size).toBeGreaterThanOrEqual(codes.length - 1);
  });

  it("derives a stable fallback code from a row id", () => {
    // Used for rows created before the column existed; must be identical every
    // time it is rendered, or an attendee's number would change between pages.
    const id = "16e7cc46-1799-4a03-9528-fb08482615d1";
    expect(registrationCodeFromId(id)).toBe(registrationCodeFromId(id));
    expect(registrationCodeFromId(id)).toMatch(/^TWC-[A-Z2-9]{6}$/);
  });

  it("gives different rows different fallback codes", () => {
    const a = registrationCodeFromId("16e7cc46-1799-4a03-9528-fb08482615d1");
    const b = registrationCodeFromId("2afc844e-f3c6-4a2c-958b-3496815b84ba");
    expect(a).not.toBe(b);
  });
});
