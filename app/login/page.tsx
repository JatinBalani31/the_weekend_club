import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LoginForm from "@/components/LoginForm";
import copy from "@/content/en.json";

export const metadata = {
 title: `${copy.navigation.login} | ${copy.brand.name}`,
};

export default function LoginPage() {
 return (
 <main className="min-h-screen bg-bg px-5 py-6 sm:px-10 sm:py-10">
 <div className="mx-auto max-w-xl">
 <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted"><ArrowLeft size={16} /> {copy.common.backHome}</Link>
 <header className="mb-10 mt-16 sm:mt-20">
 <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">{copy.auth.welcomeBack}</p>
 <h1 className="mt-4 font-display text-5xl uppercase leading-[0.9] tracking-[0.01em] sm:text-7xl">{copy.auth.loginTitle}</h1>
 </header>
 <LoginForm />
 <p className="mt-8 text-sm text-text-muted">{copy.auth.newHere} <Link href="/signup" className="font-bold text-text underline decoration-accent decoration-2 underline-offset-4">{copy.auth.createAccount}</Link></p>
 </div>
 </main>
 );
}
