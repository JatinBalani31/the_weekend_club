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
    <main className="min-h-screen bg-bg px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 font-body text-xs font-bold uppercase tracking-[0.18em] text-text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft size={16} /> {copy.common.backHome}
        </Link>

        <header className="mb-14 mt-16 max-w-3xl sm:mt-24">
          <p className="font-body text-xs font-bold uppercase tracking-[0.22em] text-accent sm:text-sm">
            {copy.events.calendar}
          </p>
          <h1 className="mt-4 font-display text-5xl uppercase leading-[0.92] tracking-[0.01em] sm:text-7xl">
            Show up.
            <br />
            Move together.
          </h1>
        </header>

        {events.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-surface px-6 py-12 text-center font-body text-sm uppercase tracking-[0.14em] text-text-muted">
            {copy.events.empty}
          </p>
        )}
      </div>
    </main>
  );
}
