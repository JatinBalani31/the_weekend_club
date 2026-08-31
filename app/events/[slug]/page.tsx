import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { getUpcomingEventBySlug } from "@/lib/events";
import copy from "@/content/en.json";
import EventBanner from "@/components/EventBanner";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short" });

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const event = await getUpcomingEventBySlug(params.slug);
  if (!event) notFound();

  return (
    <main className="min-h-screen bg-paper">
      <div className="relative min-h-[58svh] overflow-hidden bg-ink text-paper sm:min-h-[70svh]">
        <EventBanner src={event.banner_image_url} priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-ink/10" />
        <div className="relative z-10 mx-auto flex min-h-[58svh] max-w-7xl flex-col justify-between px-5 py-6 sm:min-h-[70svh] sm:px-10 sm:py-10">
          <Link href="/events" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]"><ArrowLeft size={16} /> {copy.common.allEvents}</Link>
          <div><p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-accent">{event.event_type}</p><h1 className="max-w-4xl font-display text-6xl font-black uppercase leading-[0.86] tracking-[-0.05em] sm:text-8xl">{event.title}</h1></div>
        </div>
      </div>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-10 sm:py-24 md:grid-cols-[1.4fr_1fr]">
        <div><p className="text-xl leading-relaxed text-ink/75 sm:text-2xl">{event.description}</p><p className="mt-8 max-w-md text-sm leading-relaxed text-ink/55">Bring water, comfortable shoes, and a little room in your weekend. Everyone is welcome, whether this is your first run or your fiftieth.</p></div>
        <div className="border-t border-ink/15 pt-6"><dl className="space-y-6 text-sm"><div><dt className="font-bold uppercase tracking-wider text-accent">When</dt><dd className="mt-2 text-lg">{dateFormatter.format(new Date(event.date))}</dd></div><div><dt className="font-bold uppercase tracking-wider text-accent">Where</dt><dd className="mt-2 flex items-center gap-2 text-lg"><MapPin size={18} /> {event.location}</dd></div><div><dt className="font-bold uppercase tracking-wider text-accent">Entry</dt><dd className="mt-2 text-lg">{event.price > 0 ? `INR ${event.price}` : "Free to join"}</dd></div></dl>{event.ticket_tiers && event.ticket_tiers.length > 0 && <div className="mt-8 border-t border-ink/15 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-accent">Ticket tiers</p><ul className="mt-3 space-y-3 text-sm">{event.ticket_tiers.filter((tier) => tier.is_active).map((tier) => <li key={tier.id} className="flex justify-between gap-4"><span>{tier.name}</span><span className="font-bold">INR {tier.price}</span></li>)}</ul></div>}<Link href={`/register/${event.slug}`} className="mt-10 flex min-h-14 items-center justify-between bg-accent px-5 text-sm font-bold uppercase tracking-[0.12em] text-ink">Register now <ArrowUpRight size={22} /></Link></div>
      </section>
    </main>
  );
}