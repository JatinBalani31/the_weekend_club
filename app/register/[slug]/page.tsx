import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import RegistrationForm from "@/components/RegistrationForm";
import { getUpcomingEventBySlug } from "@/lib/events";
import { getUserCookieName } from "@/lib/userAuth";
import { getSessionUser } from "@/lib/users";
import copy from "@/content/en.json";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short" });

export default async function RegisterPage({ params }: { params: { slug: string } }) {
 const event = await getUpcomingEventBySlug(params.slug);
 if (!event) notFound();

 const user = await getSessionUser(cookies().get(getUserCookieName())?.value);

 return (
 <main className="min-h-screen bg-bg px-5 py-6 sm:px-10 sm:py-10">
 <div className="mx-auto max-w-5xl">
 <Link href={`/events/${event.slug}`} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted"><ArrowLeft size={16} /> {copy.common.eventDetails}</Link>
 <div className="grid gap-14 pb-16 pt-16 sm:pt-24 md:grid-cols-[0.85fr_1.15fr] md:gap-24">
 <header><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Registration / {event.event_type}</p><h1 className="mt-4 font-display text-6xl uppercase leading-[0.86] tracking-[0.01em] sm:text-8xl">Join the<br />{event.title}</h1><div className="mt-10 border-t border-border pt-5 text-sm text-text-muted"><p>{dateFormatter.format(new Date(event.date))}</p><p className="mt-2 flex items-center gap-2"><MapPin size={16} /> {event.location}</p></div></header>
 <section><p className="mb-8 max-w-md text-lg leading-relaxed text-text-muted">Save your spot. It only takes a minute. Your ticket price is confirmed securely at checkout.</p><RegistrationForm eventSlug={event.slug} tiers={event.ticket_tiers?.filter((tier) => tier.is_active) ?? []} user={user ?? undefined} /></section>
 </div>
 </div>
 </main>
 );
}