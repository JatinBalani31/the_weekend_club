"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import copy from "@/content/en.json";

type FormValues = { name: string; email: string; phone: string; password: string };

export default function SignupForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ mode: "onBlur" });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json();
    if (!response.ok) { setSubmitError(result.error ?? copy.auth.loginError); return; }
    router.push("/account");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6">
      <Field label={copy.auth.name} error={errors.name?.message}>
        <input {...register("name", { required: copy.auth.tellName })} autoComplete="name" className="field" placeholder={copy.auth.fullNamePlaceholder} />
      </Field>
      <Field label={copy.auth.email} error={errors.email?.message}>
        <input {...register("email", { required: "Enter your email.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." } })} autoComplete="email" className="field" placeholder="you@example.com" type="email" />
      </Field>
      <Field label={copy.auth.mobileNumber} hint={copy.auth.indianNumber} error={errors.phone?.message}>
        <input {...register("phone", { required: "Enter your phone number.", pattern: { value: /^(?:\+91[\s-]?)?[6-9]\d{9}$/, message: "Enter a valid Indian phone number." } })} autoComplete="tel" className="field" inputMode="tel" placeholder="98765 43210" type="tel" />
      </Field>
      <Field label={copy.auth.password} hint={copy.auth.atLeastEight} error={errors.password?.message}>
        <input {...register("password", { required: "Choose a password.", minLength: { value: 8, message: "Use at least 8 characters." } })} autoComplete="new-password" className="field" type="password" />
      </Field>
      {submitError && <p role="alert" className="form-alert">{submitError}</p>}
      <button disabled={isSubmitting} type="submit" className="btn-primary">
        {isSubmitting ? copy.auth.creatingAccount : copy.auth.createAccount}
      </button>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="field-label"><span>{label}</span>{hint && <span className="font-medium normal-case tracking-normal text-ink/40">{hint}</span>}</span>{children}{error && <span className="field-error">{error}</span>}</label>;
}
