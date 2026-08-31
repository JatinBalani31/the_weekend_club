"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import copy from "@/content/en.json";

type FormValues = { identifier: string; password: string };

export default function LoginForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ mode: "onBlur" });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json();
    if (!response.ok) { setSubmitError(result.error ?? copy.auth.loginError); return; }
    router.push("/account");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-6">
      <Field label={copy.auth.emailOrMobile} error={errors.identifier?.message}>
        <input {...register("identifier", { required: copy.auth.enterEmailOrPhone })} autoComplete="username" className="field" placeholder={copy.auth.emailOrPhonePlaceholder} />
      </Field>
      <Field label={copy.auth.password} error={errors.password?.message}>
        <input {...register("password", { required: copy.auth.enterPassword })} autoComplete="current-password" className="field" type="password" />
      </Field>
      {submitError && <p role="alert" className="form-alert">{submitError}</p>}
      <button disabled={isSubmitting} type="submit" className="btn-primary">
        {isSubmitting ? copy.auth.signingIn : copy.navigation.login}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="field-label"><span>{label}</span></span>{children}{error && <span className="field-error">{error}</span>}</label>;
}
