import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CompleteGoogleSignup from "@/components/CompleteGoogleSignup";
import { getPendingSignupCookieName, parsePendingSignupToken } from "@/lib/userAuth";
import copy from "@/content/en.json";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `${copy.auth.completeSignup} | ${copy.brand.name}`,
};

export default function CompleteSignupPage({ searchParams }: { searchParams: { redirect?: string } }) {
  const profile = parsePendingSignupToken(cookies().get(getPendingSignupCookieName())?.value);
  if (!profile) redirect("/login?error=signup_expired");

  return (
    <main className="min-h-screen bg-bg px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted"><ArrowLeft size={16} /> {copy.common.backHome}</Link>
        <header className="mb-10 mt-16 sm:mt-20">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">{copy.auth.almostThere}</p>
          <h1 className="mt-4 font-display text-5xl uppercase leading-[0.9] tracking-[0.01em] sm:text-7xl">{copy.auth.completeSignup}</h1>
          <p className="mt-6 text-lg leading-relaxed text-text-muted">{copy.auth.completeSignupDescription}</p>
        </header>
        <CompleteGoogleSignup name={profile.name} email={profile.email} redirect={searchParams.redirect ?? "/account"} />
      </div>
    </main>
  );
}
