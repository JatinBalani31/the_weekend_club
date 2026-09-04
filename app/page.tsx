import Link from "next/link";
import { ArrowUpRight, Camera, MessageCircle, Trophy } from "lucide-react";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import EventCard from "@/components/EventCard";
import Card from "@/components/ui/Card";
import { buttonStyles } from "@/components/ui/Button";
import { getUpcomingEvents } from "@/lib/events";
import { COMMUNITY_LINKS } from "@/lib/site";
import copy from "@/content/en.json";

const HERO_SLIDES: HeroSlide[] = [
  { image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=2000&q=85", headline: copy.home.slides[0].headline, ctaText: copy.home.slides[0].cta, ctaHref: "/events" },
  { image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=2000&q=85", headline: copy.home.slides[1].headline, ctaText: copy.home.slides[1].cta, ctaHref: "#about" },
  { image: "https://images.unsplash.com/photo-1502904550040-7534597429ae?auto=format&fit=crop&w=2000&q=85", headline: copy.home.slides[2].headline, ctaText: copy.home.slides[2].cta, ctaHref: COMMUNITY_LINKS.whatsapp },
];

const COMMUNITY_CARDS = [
  { ...copy.home.community.whatsapp, href: COMMUNITY_LINKS.whatsapp, icon: MessageCircle },
  { ...copy.home.community.strava, href: COMMUNITY_LINKS.strava, icon: Trophy },
  { ...copy.home.community.instagram, href: COMMUNITY_LINKS.instagram, icon: Camera },
];

const STATS = [
  { value: "50", suffix: "+", label: copy.home.runners },
  { value: "Every", suffix: "", label: copy.home.weekend },
  { value: "Free", suffix: "", label: copy.home.toJoin },
];

export default async function Home() {
  const events = await getUpcomingEvents(3);

  return (
    <main className="overflow-hidden bg-bg">
      <HeroCarousel slides={HERO_SLIDES} />

      <section id="about" className="mx-auto max-w-7xl px-5 py-20 sm:px-10 sm:py-28">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:items-end">
          <p className="font-body text-xs font-bold uppercase tracking-[0.22em] text-accent sm:text-sm">
            {copy.home.aboutLabel}
          </p>
          <div>
            <h2 className="max-w-3xl font-display text-4xl uppercase leading-[0.95] tracking-[0.01em] sm:text-6xl">
              {copy.home.aboutTitle}
            </h2>
            <p className="mt-7 max-w-xl font-body text-lg leading-relaxed text-text-muted">
              {copy.home.aboutDescription}
            </p>
          </div>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-4 border-y border-border py-8">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-3xl uppercase text-text sm:text-5xl">
                {stat.value}
                {stat.suffix && <span className="text-accent">{stat.suffix}</span>}
              </p>
              <p className="mt-1 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted sm:text-xs">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface px-5 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="font-body text-xs font-bold uppercase tracking-[0.22em] text-accent sm:text-sm">
              {copy.home.communityLabel}
            </p>
            <h2 className="mt-3 font-display text-4xl uppercase tracking-[0.01em] sm:text-5xl">
              {copy.home.communityTitle}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {COMMUNITY_CARDS.map(({ label, description, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="group block">
                <Card interactive className="flex min-h-36 flex-col justify-between bg-bg p-5 sm:p-5">
                  <div className="flex items-start justify-between">
                    <Icon aria-hidden="true" className="text-accent" size={25} strokeWidth={1.7} />
                    <ArrowUpRight aria-hidden="true" size={22} className="text-text-muted transition-colors group-hover:text-accent" />
                  </div>
                  <div>
                    <p className="font-body text-lg font-semibold text-text">{label}</p>
                    <p className="mt-1 font-body text-sm text-text-muted">{description}</p>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-10 sm:py-28">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-body text-xs font-bold uppercase tracking-[0.22em] text-accent sm:text-sm">
              {copy.home.calendarLabel}
            </p>
            <h2 className="mt-3 font-display text-4xl uppercase tracking-[0.01em] sm:text-5xl">
              {copy.home.upcomingEvents}
            </h2>
          </div>
          <Link href="/events" className={buttonStyles("ghost", "md")}>
            {copy.home.viewAll} <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {events.length > 0 ? (
            events.map((event) => <EventCard key={event.id} event={event} />)
          ) : (
            <p className="col-span-full rounded-2xl border border-border bg-surface px-6 py-10 text-center font-body text-sm uppercase tracking-[0.14em] text-text-muted">
              {copy.home.noRuns}
            </p>
          )}
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 font-body text-xs font-bold uppercase tracking-[0.16em] text-text-muted sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4">
          <span>{copy.brand.name}</span>
          <span>{copy.brand.footerLine}</span>
        </div>
      </footer>
    </main>
  );
}
