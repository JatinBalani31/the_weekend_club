"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm">
        <div className="flex h-11 w-11 items-center justify-center bg-accent text-ink"><Lock size={20} /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-accent">{copy.brand.name}</p>
        <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[-0.03em]">{copy.admin.access}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/55">{copy.admin.loginDescription}</p>

        <label className="mt-8 block">
          <span className="field-label"><span>{copy.auth.password}</span></span>
          <input name="password" type="password" required autoFocus autoComplete="current-password" className="field" placeholder="••••••••" />
        </label>

        {error && <p role="alert" className="form-alert mt-5">{error}</p>}

        <button type="submit" disabled={isSubmitting} className="btn-primary mt-6">
          {isSubmitting ? "Checking..." : "Enter dashboard"}
        </button>
      </form>
    </main>
  );
}
