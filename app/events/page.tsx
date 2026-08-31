import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EventCard from "@/components/EventCard";
import { getUpcomingEvents } from "@/lib/events";
import copy from "@/content/en.json";

export const metadata = {
  title: copy.events.metadataTitle,
  description: copy.events.metadataDescription,
};

export default async function EventsPage() {
  const events = await getUpcomingEvents();

  return (
    <main className="min-h-screen bg-paper px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ink/60"><ArrowLeft size={16} /> {copy.common.backHome}</Link>
        <header className="mb-14 mt-16 max-w-3xl sm:mt-24"><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">{copy.events.calendar}</p><h1 className="mt-4 font-display text-6xl font-black uppercase leading-[0.88] tracking-[-0.05em]">Show up.<br />Move together.</h1></header>
        {events.length > 0 ? <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <p className="border-y border-ink/15 py-10 text-sm uppercase tracking-wider text-ink/55">{copy.events.empty}</p>}
      </div>
    </main>
  );
}