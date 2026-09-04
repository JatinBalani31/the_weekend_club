"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input, { fieldStyles, fieldLabelStyles, fieldErrorStyles } from "@/components/ui/Input";
import copy from "@/content/en.json";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  strava_handle?: string;
  ticket_tier_id?: string;
  email_updates: boolean;
};

type PrefillUser = { name: string; email: string; phone: string };

/**
 * Razorpay's checkout is a third-party widget, so it needs a literal hex rather
 * than a Tailwind token. This is the palette's `bg` - Razorpay renders white text
 * on this colour, so the light `accent` lime would be unreadable there.
 */
const CHECKOUT_THEME_COLOR = "#0A0A0B";

export default function RegistrationForm({ eventSlug, tiers = [], user }: { eventSlug: string; tiers?: { id: string; name: string; price: number }[]; user?: PrefillUser }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ mode: "onBlur", defaultValues: user ? { name: user.name, email: user.email, phone: user.phone } : undefined });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setIsProcessing(true);
    try {
      // Free events are saved by this call. Paid events only get a Razorpay
      // order back - nothing is stored until the payment is verified.
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, eventSlug }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error ?? copy.common.somethingWentWrong);

      if (order.free) {
        window.location.assign(`/success?registration_id=${encodeURIComponent(order.registrationId)}`);
        return;
      }

      await loadRazorpayScript();
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: copy.brand.name,
        description: copy.registration.eventRegistration,
        prefill: { name: values.name, email: values.email, contact: values.phone },
        theme: { color: CHECKOUT_THEME_COLOR },
        config: {
          display: {
            blocks: {
              upi: { name: "Pay via UPI", instruments: [{ method: "upi" }] },
              other: { name: "Other ways to pay", instruments: [{ method: "card" }, { method: "netbanking" }, { method: "wallet" }] },
            },
            sequence: ["block.upi", "block.other"],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (payment: RazorpayPaymentResponse) => {
          // The registration row is created here, once the payment is verified.
          const verification = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment),
          });
          const verificationResult = await verification.json();
          if (!verification.ok || !verificationResult.registrationId) {
            setSubmitError(verificationResult.error ?? copy.registration.paymentVerifyError);
            setIsProcessing(false);
            return;
          }
          window.location.assign(`/success?registration_id=${encodeURIComponent(verificationResult.registrationId)}`);
        },
        modal: { ondismiss: () => { setSubmitError(copy.registration.paymentCancelled); setIsProcessing(false); } },
      });

      // A declined card or a failed UPI collect fires this instead of `handler`.
      // Without it the modal closes and the form silently looks idle, so the
      // person has no idea whether they were charged.
      checkout.on("payment.failed", (failure: RazorpayFailureResponse) => {
        const reason = failure?.error?.description;
        setSubmitError(reason ? `${copy.registration.paymentFailed} ${reason}` : copy.registration.paymentFailed);
        setIsProcessing(false);
      });

      checkout.open();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.common.somethingWentWrong);
      setIsProcessing(false);
    }
  }

  const isBusy = isSubmitting || isProcessing;

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Input
          label={copy.auth.name}
          error={errors.name?.message}
          autoComplete="name"
          placeholder="Your full name"
          {...register("name", { required: "Tell us your name." })}
        />
        <Input
          label={copy.auth.email}
          error={errors.email?.message}
          autoComplete="email"
          placeholder="you@example.com"
          type="email"
          {...register("email", { required: "Enter your email.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." } })}
        />
        <Input
          label={copy.auth.whatsappMobile}
          hint={copy.auth.indianNumber}
          error={errors.phone?.message}
          autoComplete="tel"
          inputMode="tel"
          placeholder="98765 43210"
          type="tel"
          {...register("phone", { required: "Enter your phone number.", pattern: { value: /^(?:\+91[\s-]?)?[6-9]\d{9}$/, message: "Enter a valid Indian phone number." } })}
        />
        <Input
          label={copy.registration.stravaHandle}
          hint={copy.common.optional}
          error={errors.strava_handle?.message}
          autoComplete="off"
          placeholder="@yourhandle"
          {...register("strava_handle")}
        />

        <label className="flex min-h-11 items-start gap-3 font-body text-sm leading-relaxed text-text-muted">
          <input {...register("email_updates")} type="checkbox" className="mt-1 h-4 w-4 accent-accent" />
          <span>
            {copy.registration.sendUpdates} <span className="text-text-muted/60">{copy.common.optional}</span>
          </span>
        </label>

        {tiers.length > 0 && (
          <div>
            <span className={fieldLabelStyles}>{copy.common.ticketTiers}</span>
            <select
              {...register("ticket_tier_id", { required: copy.registration.chooseTierRequired })}
              className={`${fieldStyles} cursor-pointer appearance-none pr-10`}
            >
              <option value="">{copy.registration.chooseTier}</option>
              {tiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} - INR {tier.price}
                </option>
              ))}
            </select>
            {errors.ticket_tier_id?.message && <span className={fieldErrorStyles}>{errors.ticket_tier_id.message}</span>}
          </div>
        )}

        {submitError && (
          <p role="alert" className="rounded-xl border border-error/40 bg-error/10 p-4 font-body text-sm text-error">
            {submitError}
          </p>
        )}

        <Button type="submit" size="lg" isLoading={isBusy} className="w-full">
          {isBusy ? copy.registration.confirming : copy.registration.complete}
        </Button>
      </form>
    </Card>
  );
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: "payment.failed", handler: (failure: RazorpayFailureResponse) => void) => void;
    };
  }
}

type RazorpayPaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    metadata?: { order_id?: string; payment_id?: string };
  };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  config?: {
    display: {
      blocks: Record<string, { name: string; instruments: { method: string }[] }>;
      sequence: string[];
      preferences: { show_default_blocks: boolean };
    };
  };
  handler: (payment: RazorpayPaymentResponse) => void;
  modal: { ondismiss: () => void };
};

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(copy.registration.checkoutLoadError));
    document.body.appendChild(script);
  });
}