import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProfileForm from "@/components/ProfileForm";
import { getUserCookieName, getUserIdFromSessionToken } from "@/lib/userAuth";
import { getUserById } from "@/lib/users";
import copy from "@/content/en.json";

export const dynamic = "force-dynamic";

export const metadata = { title: `${copy.auth.settingsTitle} | ${copy.brand.name}` };

export default async function SettingsPage() {
  const userId = getUserIdFromSessionToken(cookies().get(getUserCookieName())?.value);
  if (!userId) redirect("/login");

  const user = await getUserById(userId);
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-paper px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/account" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ink/60"><ArrowLeft size={16} /> {copy.navigation.myAccount}</Link>
        <header className="mb-8 mt-14 sm:mt-20">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">{copy.auth.yourDetails}</p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-6xl">{copy.auth.settingsTitle}</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">{copy.auth.settingsDescription}</p>
        </header>
        <ProfileForm user={user} />
      </div>
    </main>
  );
}
