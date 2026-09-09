"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import copy from "@/content/en.json";

type FormValues = { phone: string };

export default function CompleteGoogleSignup({ name, email, redirect }: { name: string; email: string; redirect: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ mode: "onBlur" });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const response = await fetch("/api/auth/google/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: values.phone }),
    });
    const result = await response.json();
    if (!response.ok) { setSubmitError(result.error ?? copy.auth.loginError); return; }
    router.push(redirect);
    router.refresh();
  }

  return (
    <Card>
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">{copy.auth.signedInAs}</p>
        <p className="mt-1 font-semibold text-text">{name}</p>
        <p className="text-sm text-text-muted">{email}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Input
          label={copy.auth.whatsappMobile}
          hint={copy.auth.indianNumber}
          error={errors.phone?.message}
          autoComplete="tel"
          inputMode="tel"
          placeholder="98765 43210"
          type="tel"
          autoFocus
          {...register("phone", { required: copy.auth.enterPhone, pattern: { value: /^(?:\+91[\s-]?)?[6-9]\d{9}$/, message: copy.auth.validPhone } })}
        />
        {submitError && (
          <p role="alert" className="rounded-xl border border-error/40 bg-error/10 p-4 font-body text-sm text-error">
            {submitError}
          </p>
        )}
        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? copy.auth.saving : copy.auth.completeSignup}
        </Button>
      </form>
    </Card>
  );
}
