"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { PublicUser } from "@/lib/users";
import copy from "@/content/en.json";

type FormValues = { name: string; email: string; phone: string; currentPassword: string; newPassword: string };

export default function ProfileForm({ user }: { user: PublicUser }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    mode: "onBlur",
    defaultValues: { name: user.name, email: user.email, phone: user.phone, currentPassword: "", newPassword: "" },
  });

  const newPassword = watch("newPassword");

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setSavedMessage(null);
    const response = await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json();
    if (!response.ok) { setSubmitError(result.error ?? copy.auth.profileSaveError); return; }
    setSavedMessage(copy.auth.saved);
    reset({ ...values, currentPassword: "", newPassword: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6">
      <Field label={copy.auth.name} error={errors.name?.message}>
        <input {...register("name", { required: copy.auth.tellName })} autoComplete="name" className="field" />
      </Field>
      <Field label={copy.auth.email} error={errors.email?.message}>
        <input {...register("email", { required: "Enter your email.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." } })} autoComplete="email" type="email" className="field" />
      </Field>
      <Field label={copy.auth.mobileNumber} hint={copy.auth.indianNumber} error={errors.phone?.message}>
        <input {...register("phone", { required: "Enter your phone number.", pattern: { value: /^(?:\+91[\s-]?)?[6-9]\d{9}$/, message: "Enter a valid Indian phone number." } })} autoComplete="tel" inputMode="tel" type="tel" className="field" />
      </Field>

      <div className="border-t border-ink/15 pt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-ink/60">{copy.auth.changePassword} <span className="text-ink/40">{copy.common.optional}</span></p>
        <div className="mt-4 space-y-6">
          <Field label={copy.auth.newPassword} hint={copy.auth.atLeastEight} error={errors.newPassword?.message}>
            <input {...register("newPassword", { minLength: { value: 8, message: "Use at least 8 characters." } })} autoComplete="new-password" type="password" className="field" placeholder="Leave blank to keep current" />
          </Field>
          {newPassword && (
            <Field label={copy.auth.currentPassword} error={errors.currentPassword?.message}>
              <input {...register("currentPassword", { required: "Enter your current password to change it." })} autoComplete="current-password" type="password" className="field" />
            </Field>
          )}
        </div>
      </div>

      {submitError && <p role="alert" className="form-alert">{submitError}</p>}
      {savedMessage && <p role="status" className="border border-green-700/30 bg-green-50 p-4 text-sm text-green-800">{savedMessage}</p>}

      <button disabled={isSubmitting} type="submit" className="btn-primary">{isSubmitting ? copy.auth.saving : copy.auth.saveChanges}</button>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="field-label"><span>{label}</span>{hint && <span className="font-medium normal-case tracking-normal text-ink/40">{hint}</span>}</span>{children}{error && <span className="field-error">{error}</span>}</label>;
}
