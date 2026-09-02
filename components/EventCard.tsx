import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import type { Event } from "@/lib/events";
import copy from "@/content/en.json";
import EventBanner from "@/components/EventBanner";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

export default function EventCard({ event }: { event: Event }) {
  return (
    <Card interactive className="group flex flex-col overflow-hidden p-0 sm:p-0">
      <Link href={`/events/${event.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-hover">
          <EventBanner
            src={event.banner_image_url}
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-active:scale-105 md:group-hover:scale-105"
          />
          <Badge variant={event.event_type} className="absolute left-3 top-3">
            {event.event_type}
          </Badge>
        </div>
        <div className="p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-accent">
              {dateFormatter.format(new Date(event.date))}
            </p>
            <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
              {event.price > 0 ? `INR ${event.price}` : copy.common.free}
            </p>
          </div>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-[0.01em] text-text">{event.title}</h2>
          <p className="mt-2 line-clamp-2 font-body text-sm leading-relaxed text-text-muted">{event.description}</p>
          <p className="mt-4 font-body text-xs font-bold uppercase tracking-[0.14em] text-text-muted/70">
            {event.location}
          </p>
        </div>
      </Link>
      <div className="mt-auto flex gap-3 px-5 pb-5">
        <Link href={`/events/${event.slug}`} className={buttonStyles("secondary", "md", "flex-1")}>
          <Info aria-hidden="true" size={16} /> {copy.common.eventDetails}
        </Link>
        <Link href={`/register/${event.slug}`} className={buttonStyles("primary", "md", "flex-1")}>
          {copy.common.registerNow} <ArrowUpRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </Card>
  );
}
