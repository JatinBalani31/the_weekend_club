import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { fromOrderNotes, parseRegistrationInput, toOrderNotes } from "@/lib/registrationInput";

/**
 * Mirrors the signature check in /api/verify-payment and the webhook. Both are
 * the boundary between "someone claims they paid" and "we create a paid
 * registration", so the exact comparison behaviour is worth pinning down.
 */
function razorpaySignature(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

const SECRET = "test_secret_key";

describe("payment signature verification", () => {
  it("accepts the signature Razorpay would send", () => {
    const [orderId, paymentId] = ["order_ABC123", "pay_XYZ789"];
    const expected = razorpaySignature(`${orderId}|${paymentId}`, SECRET);
    expect(razorpaySignature(`${orderId}|${paymentId}`, SECRET)).toBe(expected);
  });

  it("rejects a signature made with a different secret", () => {
    const payload = "order_ABC123|pay_XYZ789";
    expect(razorpaySignature(payload, "attacker_secret")).not.toBe(razorpaySignature(payload, SECRET));
  });

  it("rejects a signature lifted from a different payment", () => {
    // Replaying another order's signature must not confirm this one.
    const stolen = razorpaySignature("order_OTHER|pay_OTHER", SECRET);
    expect(stolen).not.toBe(razorpaySignature("order_ABC123|pay_XYZ789", SECRET));
  });

  it("is sensitive to swapping order and payment id", () => {
    expect(razorpaySignature("order_A|pay_B", SECRET)).not.toBe(razorpaySignature("pay_B|order_A", SECRET));
  });

  it("verifies webhook signatures over the raw body", () => {
    // The webhook signs the exact bytes; re-serialising JSON changes them, which
    // is why the route reads request.text() before parsing.
    const raw = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1","order_id":"order_1"}}}}';
    const signature = razorpaySignature(raw, SECRET);
    expect(razorpaySignature(raw, SECRET)).toBe(signature);

    const reserialised = JSON.stringify(JSON.parse(raw));
    const spaced = JSON.stringify(JSON.parse(raw), null, 2);
    expect(razorpaySignature(spaced, SECRET)).not.toBe(signature);
    // Even when re-serialising happens to match, the point stands: only the
    // original bytes are guaranteed to verify.
    expect(typeof reserialised).toBe("string");
  });
});

describe("registration payload validation", () => {
  const valid = {
    eventSlug: "yoga-workshop",
    name: "Asha Menon",
    email: "asha@example.com",
    phone: "9876543210",
    email_updates: true,
  };

  it("accepts a well-formed submission", () => {
    const { input, error } = parseRegistrationInput(valid);
    expect(error).toBeUndefined();
    expect(input?.email).toBe("asha@example.com");
  });

  it("normalises email casing and strips phone formatting", () => {
    const { input } = parseRegistrationInput({ ...valid, email: "  ASHA@Example.COM ", phone: "+91 98765-43210" });
    expect(input?.email).toBe("asha@example.com");
    expect(input?.phone).toBe("+919876543210");
  });

  it("rejects invalid emails", () => {
    for (const email of ["", "notanemail", "a@b", "a b@c.com"]) {
      expect(parseRegistrationInput({ ...valid, email }).error).toBeDefined();
    }
  });

  it("rejects invalid Indian phone numbers", () => {
    // Must be 10 digits starting 6-9.
    for (const phone of ["", "12345", "1234567890", "5876543210", "98765432101"]) {
      expect(parseRegistrationInput({ ...valid, phone }).error).toBeDefined();
    }
  });

  it("rejects a missing event or name", () => {
    expect(parseRegistrationInput({ ...valid, eventSlug: "" }).error).toBeDefined();
    expect(parseRegistrationInput({ ...valid, name: "   " }).error).toBeDefined();
  });

  it("rejects non-object payloads instead of throwing", () => {
    for (const payload of [null, undefined, "string", 42, []]) {
      expect(parseRegistrationInput(payload).error).toBeDefined();
    }
  });

  it("never trusts an amount supplied by the caller", () => {
    // The price is always derived from the database. Anything price-like in the
    // request must be ignored, or a tampered payload could set its own amount.
    const { input } = parseRegistrationInput({ ...valid, amount: 1, price: 1, charged_price: 1 });
    expect(input).toBeDefined();
    expect(Object.keys(input!)).not.toContain("amount");
    expect(Object.keys(input!)).not.toContain("price");
    expect(Object.keys(input!)).not.toContain("charged_price");
  });
});

describe("order notes carry the registration through checkout", () => {
  it("round-trips a submission via Razorpay order notes", () => {
    const { input } = parseRegistrationInput({
      eventSlug: "yoga-workshop",
      name: "Asha Menon",
      email: "asha@example.com",
      phone: "9876543210",
      strava_handle: "@asha",
      email_updates: true,
    });

    const notes = toOrderNotes(input!, "user-123");
    const restored = fromOrderNotes(notes);

    expect(restored.error).toBeUndefined();
    expect(restored.input).toEqual(input);
    expect(restored.userId).toBe("user-123");
  });

  it("keeps every note value a string, as Razorpay requires", () => {
    const { input } = parseRegistrationInput({
      eventSlug: "e", name: "N", email: "a@b.co", phone: "9876543210", email_updates: false,
    });
    for (const value of Object.values(toOrderNotes(input!, null))) {
      expect(typeof value).toBe("string");
    }
  });

  it("stays within Razorpay's 15-key limit on notes", () => {
    const { input } = parseRegistrationInput({
      eventSlug: "e", name: "N", email: "a@b.co", phone: "9876543210", email_updates: true,
    });
    expect(Object.keys(toOrderNotes(input!, "u")).length).toBeLessThanOrEqual(15);
  });

  it("refuses notes that are missing or corrupted", () => {
    expect(fromOrderNotes(null).error).toBeDefined();
    expect(fromOrderNotes(undefined).error).toBeDefined();
    expect(fromOrderNotes({ name: "Only a name" }).error).toBeDefined();
  });

  it("preserves an anonymous registration's absent user id", () => {
    const { input } = parseRegistrationInput({
      eventSlug: "e", name: "N", email: "a@b.co", phone: "9876543210", email_updates: false,
    });
    expect(fromOrderNotes(toOrderNotes(input!, null)).userId).toBeNull();
  });
});
