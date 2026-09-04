"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Input
          label={copy.auth.name}
          error={errors.name?.message}
          autoComplete="name"
          placeholder={copy.auth.fullNamePlaceholder}
          {...register("name", { required: copy.auth.tellName })}
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
          label={copy.auth.mobileNumber}
          hint={copy.auth.indianNumber}
          error={errors.phone?.message}
          autoComplete="tel"
          inputMode="tel"
          placeholder="98765 43210"
          type="tel"
          {...register("phone", { required: "Enter your phone number.", pattern: { value: /^(?:\+91[\s-]?)?[6-9]\d{9}$/, message: "Enter a valid Indian phone number." } })}
        />
        <Input
          label={copy.auth.password}
          hint={copy.auth.atLeastEight}
          error={errors.password?.message}
          autoComplete="new-password"
          type="password"
          {...register("password", { required: "Choose a password.", minLength: { value: 8, message: "Use at least 8 characters." } })}
        />
        {submitError && (
          <p role="alert" className="rounded-xl border border-error/40 bg-error/10 p-4 font-body text-sm text-error">
            {submitError}
          </p>
        )}
        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? copy.auth.creatingAccount : copy.auth.createAccount}
        </Button>
      </form>
    </Card>
  );
}
