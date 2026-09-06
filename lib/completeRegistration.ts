import { Resend } from "resend";
import { COMMUNITY_LINKS } from "@/lib/site";
import { fromOrderNotes } from "@/lib/registrationInput";
import { persistRegistration, resolveEventForRegistration } from "@/lib/createRegistration";

export type CompletionResult = {
  registrationId?: string;
  created?: boolean;
  error?: string;
  status?: number;
  /** Set when the charge was reversed because we could not deliver the spot. */
  refunded?: boolean;
  /** Surfaced to the payer so they have something to quote to us. */
  paymentId?: string;
};

function razorpayAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

/**
 * Reverses a charge we cannot honour.
 *
 * Only used when the money is taken but the spot provably cannot be given -
 * the event vanished or filled up between checkout opening and payment
 * landing. Leaving the payer out of pocket is not an option, and asking them to
 * chase a refund by email is barely better.
 */
async function refundPayment(paymentId: string, reason: string): Promise<boolean> {
  const authorization = razorpayAuthHeader();
  if (!authorization) return false;

  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    // No amount: a full refund of whatever was captured.
    body: JSON.stringify({ speed: "normal", notes: { reason } }),
  });

  if (!response.ok) {
    console.error("REFUND FAILED - refund this by hand", paymentId, response.status, await response.text());
    return false;
  }
  console.error("Refunded automatically:", paymentId, reason);
  return true;
}

/**
 * Turns a paid Razorpay payment into a registration.
 *
 * Shared by the browser callback (/api/verify-payment) and the webhook, which
 * race to complete the same payment. The write is idempotent on the order id,
 * so whichever arrives first creates the row and the other is a no-op.
 *
 * The registration details are read back from the order rather than from the
 * caller, so nothing about who or what is registered can be altered after the
 * amount has been charged.
 */
export async function completePaidRegistration(orderId: string, paymentId: string): Promise<CompletionResult> {
  const authorization = razorpayAuthHeader();
  if (!authorization) return { error: "Payment is not configured yet.", status: 503 };

  // The payment, not the order, is authoritative for "did this transaction go
  // through". An order's status rolls up asynchronously, so immediately after
  // checkout it can still read "attempted" for a payment that has been
  // captured - gating on it rejected genuine payments.
  const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authorization },
  });

  if (!paymentResponse.ok) {
    console.error("Unable to load Razorpay payment", paymentId, paymentResponse.status);
    const permanent = paymentResponse.status >= 400 && paymentResponse.status < 500;
    return { error: "Could not confirm payment.", status: permanent ? 422 : 502, paymentId };
  }

  const payment = (await paymentResponse.json()) as {
    status?: string;
    order_id?: string;
    amount?: number;
  };

  // "authorized" means the money is held and will be captured; both count as
  // the payer having paid.
  if (payment.status !== "captured" && payment.status !== "authorized") {
    console.error("Payment is not in a paid state", paymentId, payment.status);
    return { error: "This payment has not completed.", status: 400, paymentId };
  }

  // The payment must belong to the order whose signature we verified. Requiring
  // it (rather than only checking when present) also rejects a standalone
  // payment, which carries no order at all and can never be reconciled to a
  // registration - the exact shape of a real failure this guard now covers.
  if (payment.order_id !== orderId) {
    console.error("Payment is not bound to this order", paymentId, payment.order_id ?? "(none)", orderId);
    return { error: "Payment verification failed.", status: 400, paymentId };
  }

  const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: authorization },
  });

  if (!orderResponse.ok) {
    console.error("Unable to load Razorpay order", orderId, orderResponse.status);
    const permanent = orderResponse.status >= 400 && orderResponse.status < 500;
    return { error: "Could not confirm payment.", status: permanent ? 422 : 502, paymentId };
  }

  const order = (await orderResponse.json()) as { amount?: number; notes?: Record<string, unknown> };

  // The charged amount must match what the order was raised for.
  if (typeof payment.amount === "number" && typeof order.amount === "number" && payment.amount !== order.amount) {
    console.error("Paid amount does not match the order", paymentId, payment.amount, order.amount);
    return { error: "Payment verification failed.", status: 400, paymentId };
  }

  const { input, userId, error: notesError } = fromOrderNotes(order.notes);
  if (notesError || !input) {
    console.error("Paid order is missing its registration notes", orderId, notesError);
    return { error: notesError ?? "Could not confirm payment.", status: 400, paymentId };
  }

  const { resolved, error: resolveError } = await resolveEventForRegistration(input);
  if (resolveError || !resolved) {
    // Paid, but the spot provably cannot be given: refund rather than keep it.
    console.error("Paid order could not be matched to an available event", orderId, resolveError);
    const refunded = await refundPayment(paymentId, `event unavailable: ${resolveError ?? "unknown"}`);
    return {
      error: refunded
        ? "That event became unavailable while you were paying, so your payment has been refunded. It should reach you within a few working days."
        : "Your payment went through but the event is no longer available. Please contact us and quote your payment id.",
      status: 409,
      refunded,
      paymentId,
    };
  }

  const { registrationId, created, error } = await persistRegistration({
    input,
    resolved,
    userId: userId ?? null,
    paymentStatus: "paid",
    razorpayOrderId: orderId,
    paymentId,
  });

  if (error || !registrationId) {
    const full = /full|sold out/i.test(error ?? "");
    console.error("Unable to save registration after payment", orderId, error);

    // A full event is final, so reverse the charge. Anything else may be
    // transient (the webhook or a retry can still succeed), so keep the money
    // and let the payer retry rather than refunding a spot they may still get.
    const refunded = full ? await refundPayment(paymentId, "event full at capacity") : false;
    return {
      error: refunded
        ? "That event filled up while you were paying, so your payment has been refunded. It should reach you within a few working days."
        : "Your payment went through but we could not save your registration yet. Please retry, or contact us and quote your payment id.",
      status: full ? 409 : 500,
      refunded,
      paymentId,
    };
  }

  // Only the call that actually created the row sends the email, so the browser
  // callback and the webhook cannot both mail the same attendee.
  if (created) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (resendApiKey && fromEmail) {
      const resend = new Resend(resendApiKey);
      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: input.email,
        subject: `You're in: ${resolved.event.title}`,
        text: `Hi ${input.name},\n\nYour payment is confirmed for ${resolved.event.title}.\nDate: ${new Date(resolved.event.date).toLocaleString("en-IN")}\nLocation: ${resolved.event.location}\n\nJoin the WhatsApp community: ${COMMUNITY_LINKS.whatsapp}\n\nSee you outside!\nthe Weekend Club`,
      });
      if (emailError) console.error("Unable to send confirmation email", emailError);
    }
  }

  return { registrationId, created, paymentId };
}
