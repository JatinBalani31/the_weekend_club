import Link from "next/link";
import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { getUpcomingEventBySlug } from "@/lib/events";
import copy from "@/content/en.json";
import EventBanner from "@/components/EventBanner";
import Badge from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short" });

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const event = await getUpcomingEventBySlug(params.slug);
  if (!event) notFound();

  const activeTiers = (event.ticket_tiers ?? []).filter((tier) => tier.is_active);

  return (
    <main className="min-h-screen bg-bg">
      <div className="relative min-h-[58svh] overflow-hidden bg-surface text-text sm:min-h-[70svh]">
        <EventBanner src={event.banner_image_url} priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/10" />
        <div className="relative z-10 mx-auto flex min-h-[58svh] max-w-7xl flex-col justify-between px-5 py-6 sm:min-h-[70svh] sm:px-10 sm:py-10">
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center gap-2 font-body text-xs font-bold uppercase tracking-[0.18em] text-text transition-colors hover:text-accent"
          >
            <ArrowLeft size={16} /> {copy.common.allEvents}
          </Link>
          <div>
            <Badge variant={event.event_type} className="mb-4">{event.event_type}</Badge>
            <h1 className="max-w-4xl font-display text-5xl uppercase leading-[0.9] tracking-[0.01em] sm:text-8xl">
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-10 sm:py-24 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-body text-xl leading-relaxed text-text sm:text-2xl">{event.description}</p>
          <p className="mt-8 max-w-md font-body text-sm leading-relaxed text-text-muted">{copy.events.bringWhat}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <dl className="space-y-6 font-body text-sm">
            <div>
              <dt className="font-bold uppercase tracking-[0.14em] text-accent">{copy.common.when}</dt>
              <dd className="mt-2 text-lg text-text">{dateFormatter.format(new Date(event.date))}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.14em] text-accent">{copy.common.where}</dt>
              <dd className="mt-2 flex items-center gap-2 text-lg text-text">
                <MapPin size={18} className="shrink-0 text-text-muted" /> {event.location}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.14em] text-accent">{copy.common.entry}</dt>
              <dd className="mt-2 text-lg text-text">
                {event.price > 0 ? `INR ${event.price}` : copy.common.freeToJoin}
              </dd>
            </div>
          </dl>

          {activeTiers.length > 0 && (
            <div className="mt-8 border-t border-border pt-5">
              <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-accent">
                {copy.common.ticketTiers}
              </p>
              <ul className="mt-3 space-y-3 font-body text-sm text-text">
                {activeTiers.map((tier) => (
                  <li key={tier.id} className="flex justify-between gap-4">
                    <span>{tier.name}</span>
                    <span className="font-semibold">INR {tier.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href={`/register/${event.slug}`} className={buttonStyles("primary", "lg", "mt-10 w-full")}>
            {copy.common.registerNow} <ArrowUpRight aria-hidden="true" size={20} />
          </Link>
        </div>
      </section>
    </main>
  );
}
