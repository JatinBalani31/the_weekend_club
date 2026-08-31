import Link from "next/link";
import { ArrowUpRight, Camera, MessageCircle, Trophy } from "lucide-react";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import EventCard from "@/components/EventCard";
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

export default async function Home() {
  const events = await getUpcomingEvents(3);

  return (
    <main className="overflow-hidden bg-paper">
      <HeroCarousel slides={HERO_SLIDES} />
      <section id="about" className="mx-auto max-w-7xl px-5 py-20 sm:px-10 sm:py-28">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:items-end">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">{copy.home.aboutLabel}</p>
          <div>
            <h2 className="max-w-3xl font-display text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-6xl">{copy.home.aboutTitle}</h2>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink/70">{copy.home.aboutDescription}</p>
          </div>
        </div>
        <div className="mt-16 grid grid-cols-3 border-y border-ink/15 py-6">
          <div><p className="font-display text-3xl font-black sm:text-5xl">50<span className="text-accent">+</span></p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-ink/50">{copy.home.runners}</p></div>
          <div><p className="font-display text-3xl font-black sm:text-5xl">Every</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-ink/50">{copy.home.weekend}</p></div>
          <div><p className="font-display text-3xl font-black sm:text-5xl">Free</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-ink/50">{copy.home.toJoin}</p></div>
        </div>
      </section>
      <section className="bg-ink px-5 py-20 text-paper sm:px-10 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10"><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">{copy.home.communityLabel}</p><h2 className="mt-3 font-display text-4xl font-black uppercase tracking-[-0.04em] sm:text-5xl">{copy.home.communityTitle}</h2></div>
          <div className="grid gap-3 md:grid-cols-3">
            {COMMUNITY_CARDS.map(({ label, description, href, icon: Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="group flex min-h-36 flex-col justify-between border border-paper/20 p-5 transition-colors active:bg-accent active:text-ink md:hover:bg-accent md:hover:text-ink">
                <div className="flex items-start justify-between"><Icon aria-hidden="true" className="text-accent group-active:text-ink md:group-hover:text-ink" size={25} strokeWidth={1.7} /><ArrowUpRight aria-hidden="true" size={22} /></div>
                <div><p className="text-lg font-bold">{label}</p><p className="mt-1 text-sm text-paper/55 group-active:text-ink/70 md:group-hover:text-ink/70">{description}</p></div>
              </a>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-10 sm:py-28">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">{copy.home.calendarLabel}</p><h2 className="mt-3 font-display text-4xl font-black uppercase tracking-[-0.04em] sm:text-5xl">{copy.home.upcomingEvents}</h2></div>
          <Link href="/events" className="flex min-h-11 items-center gap-2 text-sm font-bold uppercase tracking-wider underline decoration-accent decoration-2 underline-offset-4">{copy.home.viewAll} <ArrowUpRight size={18} /></Link>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {events.length > 0 ? events.map((event) => <EventCard key={event.id} event={event} />) : <p className="col-span-full border-y border-ink/15 py-8 text-sm uppercase tracking-wider text-ink/55">{copy.home.noRuns}</p>}
        </div>
      </section>
      <footer className="border-t border-ink/15 px-5 py-8 text-xs font-bold uppercase tracking-[0.16em] text-ink/50 sm:px-10"><div className="mx-auto flex max-w-7xl justify-between gap-4"><span>{copy.brand.name}</span><span>{copy.brand.footerLine}</span></div></footer>
    </main>
  );
}
