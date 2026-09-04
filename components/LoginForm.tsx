"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Input
          label={copy.auth.emailOrMobile}
          error={errors.identifier?.message}
          autoComplete="username"
          placeholder={copy.auth.emailOrPhonePlaceholder}
          {...register("identifier", { required: copy.auth.enterEmailOrPhone })}
        />
        <Input
          label={copy.auth.password}
          error={errors.password?.message}
          autoComplete="current-password"
          type="password"
          {...register("password", { required: copy.auth.enterPassword })}
        />
        {submitError && (
          <p role="alert" className="rounded-xl border border-error/40 bg-error/10 p-4 font-body text-sm text-error">
            {submitError}
          </p>
        )}
        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? copy.auth.signingIn : copy.navigation.login}
        </Button>
      </form>
    </Card>
  );
}
