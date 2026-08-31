import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SignupForm from "@/components/SignupForm";
import copy from "@/content/en.json";

export const metadata = {
  title: `${copy.auth.signupTitle} | ${copy.brand.name}`,
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-paper px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ink/60"><ArrowLeft size={16} /> {copy.common.backHome}</Link>
        <header className="mb-10 mt-16 sm:mt-20">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">{copy.auth.joinClub}</p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-7xl">{copy.auth.signupTitle}</h1>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">{copy.auth.signupDescription}</p>
        </header>
        <SignupForm />
        <p className="mt-8 text-sm text-ink/55">{copy.auth.alreadyHaveAccount} <Link href="/login" className="font-bold text-ink underline decoration-accent decoration-2 underline-offset-4">{copy.navigation.login}</Link></p>
      </div>
    </main>
  );
}
