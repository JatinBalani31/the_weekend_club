"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fieldStyles, fieldLabelStyles } from "@/components/ui/Input";
import copy from "@/content/en.json";

export default function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: formData.get("password") }) });
    const result = await response.json();
    setIsSubmitting(false);
    if (!response.ok) { setError(result.error ?? copy.admin.unableToSignIn); return; }
    window.location.reload();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-12">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-bg">
            <Lock size={20} />
          </div>
          <p className="mt-6 font-body text-xs font-bold uppercase tracking-[0.18em] text-accent">{copy.brand.name}</p>
          <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.01em]">{copy.admin.access}</h1>
          <p className="mt-3 font-body text-sm leading-relaxed text-text-muted">{copy.admin.loginDescription}</p>

          <label className="mt-8 block">
            <span className={fieldLabelStyles}>{copy.auth.password}</span>
            <input
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              className={fieldStyles}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-error/40 bg-error/10 p-4 font-body text-sm text-error">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-6 w-full">
            {isSubmitting ? copy.admin.checking : copy.admin.enterDashboard}
          </Button>
        </form>
      </Card>
    </main>
  );
}
