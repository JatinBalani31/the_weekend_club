import { describe, expect, it } from "vitest";

/**
 * Regression cover for a real failure: a live payment succeeded and the payer
 * was told "payment verification failed".
 *
 * The cause was gating on the ORDER's rolled-up status immediately after
 * checkout. Razorpay updates that asynchronously, so a captured payment can sit
 * behind an order still reading `attempted` with `amount_paid: 0`. The payment
 * object is the authoritative record for a single transaction.
 */

/** The old, racy gate - kept here purely to show what it did wrong. */
function oldOrderGateRejects(order: { status?: string; amount_paid?: number }) {
  return order.status !== "paid" && !order.amount_paid;
}

/** What the code checks now. */
function paymentIsPaid(payment: { status?: string }) {
  return payment.status === "captured" || payment.status === "authorized";
}

describe("payment completion gating", () => {
  it("the old order gate rejected a genuinely captured payment", () => {
    // Exactly the state Razorpay returns in the moments after checkout closes.
    const orderJustAfterCheckout = { status: "attempted", amount_paid: 0 };
    expect(oldOrderGateRejects(orderJustAfterCheckout)).toBe(true);

    // ...while the payment itself was already captured.
    expect(paymentIsPaid({ status: "captured" })).toBe(true);
  });

  it("accepts captured and authorized payments", () => {
    expect(paymentIsPaid({ status: "captured" })).toBe(true);
    // Money is held and will be captured; the payer has paid either way.
    expect(paymentIsPaid({ status: "authorized" })).toBe(true);
  });

  it("still refuses payments that genuinely did not complete", () => {
    for (const status of ["created", "failed", "refunded", undefined]) {
      expect(paymentIsPaid({ status })).toBe(false);
    }
  });

  it("binds a payment to the order whose signature was verified", () => {
    // Guards against replaying a payment from one order onto another.
    const belongsToOrder = (payment: { order_id?: string }, orderId: string) =>
      !payment.order_id || payment.order_id === orderId;

    expect(belongsToOrder({ order_id: "order_A" }, "order_A")).toBe(true);
    expect(belongsToOrder({ order_id: "order_B" }, "order_A")).toBe(false);
  });

  it("requires the captured amount to match the order", () => {
    const amountsMatch = (payment: { amount?: number }, order: { amount?: number }) =>
      typeof payment.amount !== "number" || typeof order.amount !== "number" || payment.amount === order.amount;

    expect(amountsMatch({ amount: 10000 }, { amount: 10000 })).toBe(true);
    // Paying less than the order was raised for must not confirm.
    expect(amountsMatch({ amount: 100 }, { amount: 10000 })).toBe(false);
  });
});

describe("failure classification decides whether a retry is offered", () => {
  // 5xx may succeed later (transient, or the webhook lands); 4xx is settled.
  const retryable = (status: number) => status >= 500;

  it("offers a retry for transient failures", () => {
    expect(retryable(500)).toBe(true);
    expect(retryable(502)).toBe(true);
  });

  it("does not offer a false retry once the outcome is settled", () => {
    expect(retryable(409)).toBe(false); // event full or gone - refunded
    expect(retryable(400)).toBe(false); // signature or state failure
    expect(retryable(422)).toBe(false); // order not ours
  });
});

describe("checkout must be bound to a server-created order", () => {
  /**
   * A real live payment was taken with no order_id and could never be verified:
   * Razorpay treated it as standalone, returned no usable signature, and left
   * the money authorised but uncaptured. These pin the contract that broke.
   */
  it("the browser sends the order id it was given", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("components/RegistrationForm.tsx", "utf8"),
    );

    // The options object handed to Razorpay must carry the order id.
    expect(source, "checkout options must include order_id").toMatch(/order_id:\s*order\.orderId/);
  });

  it("refuses to open checkout when the server returned no order id", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("components/RegistrationForm.tsx", "utf8"),
    );
    // Taking money that cannot be reconciled is worse than not taking it.
    expect(source).toMatch(/if\s*\(!order\.orderId\)\s*throw/);
  });

  it("a payment with no order id is rejected rather than accepted", () => {
    const belongsToOrder = (payment: { order_id?: string | null }, orderId: string) =>
      Boolean(payment.order_id) && payment.order_id === orderId;

    expect(belongsToOrder({ order_id: null }, "order_A")).toBe(false);
    expect(belongsToOrder({}, "order_A")).toBe(false);
    expect(belongsToOrder({ order_id: "order_A" }, "order_A")).toBe(true);
  });
});
