import { Resend } from "resend";
import { COMMUNITY_LINKS } from "@/lib/site";
import { fromOrderNotes } from "@/lib/registrationInput";
import { persistRegistration, resolveEventForRegistration } from "@/lib/createRegistration";

export type CompletionResult = {
  registrationId?: string;
  created?: boolean;
  error?: string;
  status?: number;
};

function razorpayAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

/**
 * Turns a paid Razorpay order into a registration.
 *
 * Shared by the browser callback (/api/verify-payment) and the webhook, which
 * both race to complete the same payment. The write is idempotent on the order
 * id, so whichever arrives first creates the row and the other is a no-op - the
 * webhook is what guarantees the registration survives a browser that closes
 * mid-payment.
 *
 * The registration details are read back from the order itself rather than from
 * the caller, so nothing about who or what is registered can be altered after
 * the amount has been charged.
 */
export async function completePaidRegistration(orderId: string, paymentId: string): Promise<CompletionResult> {
  const authorization = razorpayAuthHeader();
  if (!authorization) return { error: "Payment is not configured yet.", status: 503 };

  const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: authorization },
  });

  if (!orderResponse.ok) {
    console.error("Unable to load Razorpay order", orderId, orderResponse.status);
    // Any 4xx means this order will never resolve for our account - Razorpay
    // answers an unknown id with 400, not 404 - so report it as permanent and
    // stop the retries. 5xx and rate limiting may still succeed on a retry.
    const permanent = orderResponse.status >= 400 && orderResponse.status < 500;
    return { error: "Could not confirm payment.", status: permanent ? 422 : 502 };
  }

  const order = (await orderResponse.json()) as { status?: string; amount_paid?: number; notes?: Record<string, unknown> };
  if (order.status !== "paid" && !order.amount_paid) {
    return { error: "This payment has not completed.", status: 400 };
  }

  const { input, userId, error: notesError } = fromOrderNotes(order.notes);
  if (notesError || !input) {
    console.error("Paid order is missing its registration notes", orderId, notesError);
    return { error: notesError ?? "Could not confirm payment.", status: 400 };
  }

  const { resolved, error: resolveError } = await resolveEventForRegistration(input);
  if (resolveError || !resolved) {
    console.error("Paid order could not be matched to an available event", orderId, resolveError);
    return {
      error: "Your payment went through but the event is no longer available. Please contact us and quote your payment id.",
      status: 409,
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
    console.error("Unable to save registration after payment", orderId, error);
    return {
      error: "Your payment went through but we could not save your registration. Please contact us and quote your payment id.",
      status: 500,
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

  return { registrationId, created };
}
