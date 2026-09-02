"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Input
          label={copy.auth.name}
          error={errors.name?.message}
          autoComplete="name"
          {...register("name", { required: copy.auth.tellName })}
        />
        <Input
          label={copy.auth.email}
          error={errors.email?.message}
          autoComplete="email"
          type="email"
          {...register("email", { required: "Enter your email.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." } })}
        />
        <Input
          label={copy.auth.mobileNumber}
          hint={copy.auth.indianNumber}
          error={errors.phone?.message}
          autoComplete="tel"
          inputMode="tel"
          type="tel"
          {...register("phone", { required: "Enter your phone number.", pattern: { value: /^(?:\+91[\s-]?)?[6-9]\d{9}$/, message: "Enter a valid Indian phone number." } })}
        />

        <div className="border-t border-border pt-6">
          <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
            {copy.auth.changePassword} <span className="text-text-muted/60">{copy.common.optional}</span>
          </p>
          <div className="mt-4 space-y-6">
            <Input
              label={copy.auth.newPassword}
              hint={copy.auth.atLeastEight}
              error={errors.newPassword?.message}
              autoComplete="new-password"
              type="password"
              placeholder="Leave blank to keep current"
              {...register("newPassword", { minLength: { value: 8, message: "Use at least 8 characters." } })}
            />
            {newPassword && (
              <Input
                label={copy.auth.currentPassword}
                error={errors.currentPassword?.message}
                autoComplete="current-password"
                type="password"
                {...register("currentPassword", { required: "Enter your current password to change it." })}
              />
            )}
          </div>
        </div>

        {submitError && (
          <p role="alert" className="rounded-xl border border-error/40 bg-error/10 p-4 font-body text-sm text-error">
            {submitError}
          </p>
        )}
        {savedMessage && (
          <p role="status" className="rounded-xl border border-success/40 bg-success/10 p-4 font-body text-sm text-success">
            {savedMessage}
          </p>
        )}

        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? copy.auth.saving : copy.auth.saveChanges}
        </Button>
      </form>
    </Card>
  );
}
