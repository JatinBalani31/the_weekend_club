import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LogOut, MapPin } from "lucide-react";
import RegistrationPass from "@/components/RegistrationPass";
import { buttonStyles } from "@/components/ui/Button";
import { getUserCookieName } from "@/lib/userAuth";
import { getSessionUser, getUserRegistrations } from "@/lib/users";
import copy from "@/content/en.json";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function AccountPage() {
  const user = await getSessionUser(cookies().get(getUserCookieName())?.value);
  if (!user) redirect("/login");

  const registrations = await getUserRegistrations(user.id);

  return (
    <main className="min-h-screen bg-bg px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 font-body text-xs font-bold uppercase tracking-[0.18em] text-text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft size={16} /> {copy.common.backHome}
        </Link>

        <header className="mt-16 flex flex-wrap items-start justify-between gap-6 border-b border-border pb-8 sm:mt-20">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.22em] text-accent sm:text-sm">
              {copy.account.title}
            </p>
            <h1 className="mt-4 font-display text-5xl uppercase leading-[0.9] tracking-[0.01em] sm:text-7xl">
              {user.name}
            </h1>
            <p className="mt-3 font-body text-sm text-text-muted">{user.email} · {user.phone}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" aria-label={copy.navigation.logOut} className={buttonStyles("secondary", "md")}>
              <LogOut size={16} /> {copy.navigation.logOut}
            </button>
          </form>
        </header>

        <section className="mt-8">
          <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
            {registrations.length} {registrations.length === 1 ? copy.account.registrationCount : copy.account.registrationsCount}
          </p>

          {registrations.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-border bg-surface px-6 py-10 font-body text-sm uppercase tracking-[0.14em] text-text-muted">
              {copy.account.empty}{" "}
              <Link href="/events" className="text-text underline decoration-accent decoration-2 underline-offset-4">
                {copy.account.browseEvents}
              </Link>
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {registrations.map((registration) => (
                <li key={registration.id} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl uppercase tracking-[0.01em]">
                        {registration.event?.title ?? copy.common.unknownEvent}
                      </p>
                      {registration.event && (
                        <p className="mt-1 flex items-center gap-2 font-body text-sm text-text-muted">
                          <MapPin size={14} /> {registration.event.location} ·{" "}
                          {dateFormatter.format(new Date(registration.event.date))}
                        </p>
                      )}
                      {registration.ticket_tier && (
                        <p className="mt-1 font-body text-sm text-text-muted">{registration.ticket_tier.name}</p>
                      )}
                    </div>
                    <span
                      className={`font-body text-xs font-bold uppercase tracking-[0.12em] ${registration.payment_status === "paid" ? "text-success" : "text-text-muted"}`}
                    >
                      {registration.payment_status}
                      {registration.charged_price != null ? ` · INR ${registration.charged_price}` : ""}
                    </span>
                  </div>

                  <details className="group mt-4 border-t border-border pt-4">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-body text-xs font-bold uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-accent">
                      <span>
                        {copy.account.registrationNumber}:{" "}
                        <span className="text-accent">{registration.registration_code}</span>
                      </span>
                      <span className="text-text-muted group-open:hidden">{copy.account.showPass}</span>
                      <span className="hidden text-text-muted group-open:inline">{copy.account.hidePass}</span>
                    </summary>
                    <RegistrationPass registrationCode={registration.registration_code} className="mt-4 bg-bg" />
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
