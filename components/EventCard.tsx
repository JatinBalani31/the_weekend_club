import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import type { Event } from "@/lib/events";
import copy from "@/content/en.json";
import EventBanner from "@/components/EventBanner";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

export default function EventCard({ event }: { event: Event }) {
  return (
    <article className="group">
      <Link href={`/events/${event.slug}`} className="block min-h-11">
        <div className="relative aspect-[4/3] overflow-hidden bg-ink">
          <EventBanner
            src={event.banner_image_url}
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-active:scale-105 md:group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
            {event.event_type}
          </span>
        </div>
        <div className="pt-5">
          <p className="text-sm font-bold uppercase tracking-wider text-accent">
            {dateFormatter.format(new Date(event.date))}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.02em]">
            {event.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">{event.description}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink/45">{event.location}</p>
        </div>
      </Link>
      <div className="flex gap-3 border-b border-ink/15 pb-5 pt-4">
        <Link
          href={`/events/${event.slug}`}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 border border-ink/20 px-3 text-xs font-bold uppercase tracking-wider"
        >
          <Info aria-hidden="true" size={16} /> {copy.common.eventDetails}
        </Link>
        <Link
          href={`/register/${event.slug}`}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 bg-accent px-3 text-xs font-bold uppercase tracking-wider text-ink"
        >
          {copy.common.registerNow} <ArrowUpRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </article>
  );
}