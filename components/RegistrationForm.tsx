"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, eventSlug }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? copy.common.somethingWentWrong);

      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: result.registrationId }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error ?? copy.registration.paymentStartError);
      if (order.free) {
        window.location.assign(`/success?registration_id=${encodeURIComponent(result.registrationId)}`);
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
        theme: { color: "#ff5a36" },
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
          const verification = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registrationId: result.registrationId, ...payment }),
          });
          const verificationResult = await verification.json();
          if (!verification.ok) {
            setSubmitError(verificationResult.error ?? copy.registration.paymentVerifyError);
            setIsProcessing(false);
            return;
          }
          window.location.assign(`/success?registration_id=${encodeURIComponent(result.registrationId)}`);
        },
        modal: { ondismiss: () => { setSubmitError(copy.registration.paymentCancelled); setIsProcessing(false); } },
      });
      checkout.open();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.common.somethingWentWrong);
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6">
      <Field label={copy.auth.name} error={errors.name?.message}>
        <input {...register("name", { required: "Tell us your name." })} autoComplete="name" className="field" placeholder="Your full name" />
      </Field>
      <Field label={copy.auth.email} error={errors.email?.message}>
        <input {...register("email", { required: "Enter your email.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." } })} autoComplete="email" className="field" placeholder="you@example.com" type="email" />
      </Field>
      <Field label={copy.auth.whatsappMobile} hint={copy.auth.indianNumber} error={errors.phone?.message}>
        <input {...register("phone", { required: "Enter your phone number.", pattern: { value: /^(?:\+91[\s-]?)?[6-9]\d{9}$/, message: "Enter a valid Indian phone number." } })} autoComplete="tel" className="field" inputMode="tel" placeholder="98765 43210" type="tel" />
      </Field>
      <Field label={copy.registration.stravaHandle} hint={copy.common.optional} error={errors.strava_handle?.message}>
        <input {...register("strava_handle")} autoComplete="off" className="field" placeholder="@yourhandle" />
      </Field>
      <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed text-ink/65"><input {...register("email_updates")} type="checkbox" className="mt-1 h-4 w-4 accent-accent" /> <span>{copy.registration.sendUpdates} <span className="text-ink/40">{copy.common.optional}</span></span></label>
      {tiers.length > 0 && <Field label={copy.common.ticketTiers} error={errors.ticket_tier_id?.message}><select {...register("ticket_tier_id", { required: copy.registration.chooseTierRequired })} className="field"><option value="">{copy.registration.chooseTier}</option>{tiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name} - INR {tier.price}</option>)}</select></Field>}
      {submitError && <p role="alert" className="form-alert">{submitError}</p>}
      <button disabled={isSubmitting || isProcessing} type="submit" className="btn-primary">
        {isSubmitting || isProcessing ? copy.registration.confirming : copy.registration.complete}
      </button>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="field-label"><span>{label}</span>{hint && <span className="font-medium normal-case tracking-normal text-ink/40">{hint}</span>}</span>{children}{error && <span className="field-error">{error}</span>}</label>;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

type RazorpayPaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
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