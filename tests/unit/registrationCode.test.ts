import { describe, expect, it } from "vitest";
import { generateAvailableRegistrationCode, generateRegistrationCode, registrationCodeFromId } from "@/lib/registrationCode";

describe("registration codes", () => {
  it("generates random four-digit registration codes starting with zero", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateRegistrationCode()).toMatch(/^TWC-0\d{3}$/);
    }
  });

  it("allocates a unique available code and stops when the range is exhausted", () => {
    const usedCodes = new Set(Array.from({ length: 999 }, (_, index) => `TWC-${String(index).padStart(4, "0")}`));
    expect(generateAvailableRegistrationCode(usedCodes)).toBe("TWC-0999");
    usedCodes.add("TWC-0999");
    expect(generateAvailableRegistrationCode(usedCodes)).toBeNull();
  });

  it("derives a stable fallback code from a row id", () => {
    const id = "16e7cc46-1799-4a03-9528-fb08482615d1";
    expect(registrationCodeFromId(id)).toBe(registrationCodeFromId(id));
    expect(registrationCodeFromId(id)).toMatch(/^TWC-0\d{3}$/);
  });
});
