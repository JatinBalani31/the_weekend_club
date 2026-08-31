import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LogOut, MapPin } from "lucide-react";
import { getUserCookieName, getUserIdFromSessionToken } from "@/lib/userAuth";
import { getUserById, getUserRegistrations } from "@/lib/users";
import copy from "@/content/en.json";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function AccountPage() {
  const token = cookies().get(getUserCookieName())?.value;
  const userId = getUserIdFromSessionToken(token);
  if (!userId) redirect("/login");

  const user = await getUserById(userId);
  if (!user) redirect("/login");

  const registrations = await getUserRegistrations(userId);

  return (
    <main className="min-h-screen bg-paper px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ink/60"><ArrowLeft size={16} /> {copy.common.backHome}</Link>

        <header className="mt-16 flex items-start justify-between gap-6 border-b border-ink/15 pb-8 sm:mt-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">{copy.account.title}</p>
            <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-7xl">{user.name}</h1>
            <p className="mt-3 text-sm text-ink/55">{user.email} · {user.phone}</p>
          </div>
          <form action="/api/auth/logout" method="post"><button type="submit" aria-label={copy.navigation.logOut} className="flex min-h-11 items-center gap-2 border border-ink/20 px-3 text-xs font-bold uppercase tracking-wider"><LogOut size={16} /> {copy.navigation.logOut}</button></form>
        </header>

        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-ink/60">{registrations.length} {registrations.length === 1 ? copy.account.registrationCount : copy.account.registrationsCount}</p>
          {registrations.length === 0 ? (
            <p className="mt-6 border-y border-ink/15 py-10 text-sm uppercase tracking-wider text-ink/55">{copy.account.empty} <Link href="/events" className="text-ink underline decoration-accent decoration-2 underline-offset-4">{copy.account.browseEvents}</Link></p>
          ) : (
            <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/15">
              {registrations.map((registration) => (
                <li key={registration.id} className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl font-black uppercase tracking-[-0.02em]">{registration.event?.title ?? copy.common.unknownEvent}</p>
                      {registration.event && <p className="mt-1 flex items-center gap-2 text-sm text-ink/60"><MapPin size={14} /> {registration.event.location} · {dateFormatter.format(new Date(registration.event.date))}</p>}
                      {registration.ticket_tier && <p className="mt-1 text-sm text-ink/55">{registration.ticket_tier.name}</p>}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${registration.payment_status === "paid" ? "text-green-700" : "text-ink/60"}`}>{registration.payment_status}{registration.charged_price != null ? ` · INR ${registration.charged_price}` : ""}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
