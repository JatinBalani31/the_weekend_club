import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Camera, Check, MessageCircle, Trophy } from "lucide-react";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import { getRegistrationById } from "@/lib/registrations";
import { COMMUNITY_LINKS } from "@/lib/site";
import copy from "@/content/en.json";

export const metadata = { title: copy.success.metadataTitle };

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short" });

export default async function SuccessPage({ searchParams }: { searchParams: { registration_id?: string } }) {
  const registration = searchParams.registration_id ? await getRegistrationById(searchParams.registration_id) : null;
  const event = registration?.event;

  return (
    <main className="min-h-screen bg-ink px-5 py-10 text-paper sm:px-10 sm:py-16">
      <div className="mx-auto max-w-4xl"><div className="flex h-16 w-16 items-center justify-center bg-accent text-ink"><Check size={32} strokeWidth={3} /></div><p className="mt-10 text-sm font-bold uppercase tracking-[0.2em] text-accent">Registration received</p><h1 className="mt-4 max-w-3xl font-display text-6xl font-black uppercase leading-[0.86] tracking-[-0.05em] sm:text-8xl">You are on the list.</h1>
        {event ? <div className="mt-10 grid gap-8 border-y border-paper/20 py-7 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wider text-accent">Event</p><p className="mt-2 text-xl font-bold">{event.title}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-accent">When</p><p className="mt-2 text-lg">{dateFormatter.format(new Date(event.date))}</p><p className="mt-1 text-sm text-paper/55">{event.location}</p></div></div> : <p className="mt-8 max-w-md text-lg leading-relaxed text-paper/65">Your registration details are saved. We will share the next steps with you soon.</p>}
        {event && <div className="mt-8"><AddToCalendarButton title={event.title} date={event.date} location={event.location} /></div>}
        <section className="mt-16 border-t border-paper/20 pt-8"><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Keep moving with us</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><CommunityLink href={COMMUNITY_LINKS.whatsapp} label="WhatsApp" icon={<MessageCircle size={20} />} /><CommunityLink href={COMMUNITY_LINKS.strava} label="Strava" icon={<Trophy size={20} />} /><CommunityLink href={COMMUNITY_LINKS.instagram} label="Instagram" icon={<Camera size={20} />} /></div></section>
        <Link href="/" className="mt-12 inline-flex min-h-12 items-center gap-3 border border-paper/25 px-5 text-sm font-bold uppercase tracking-wider"><ArrowLeft size={18} /> Back home</Link></div>
    </main>
  );
}

function CommunityLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between border border-paper/20 px-4 text-sm font-bold uppercase tracking-wider"><span className="flex items-center gap-3">{icon}{label}</span><ArrowUpRight size={18} /></a>;
}