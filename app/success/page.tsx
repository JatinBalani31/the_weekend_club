import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Camera, Check, MessageCircle, Trophy } from "lucide-react";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import RegistrationPass from "@/components/RegistrationPass";
import { buttonStyles } from "@/components/ui/Button";
import { getRegistrationById } from "@/lib/registrations";
import { COMMUNITY_LINKS } from "@/lib/site";
import copy from "@/content/en.json";
import { eventDateTimeFormatter as dateFormatter } from "@/lib/dateTime";

export const metadata = { title: copy.success.metadataTitle };

export default async function SuccessPage({ searchParams }: { searchParams: { registration_id?: string } }) {
  const registration = searchParams.registration_id ? await getRegistrationById(searchParams.registration_id) : null;
  const event = registration?.event;

  return (
    <main className="min-h-screen bg-bg px-5 py-10 text-text sm:px-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-bg">
          <Check size={32} strokeWidth={3} />
        </div>
        <p className="mt-10 font-body text-xs font-bold uppercase tracking-[0.22em] text-accent sm:text-sm">
          {copy.success.received}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl uppercase leading-[0.9] tracking-[0.01em] sm:text-8xl">
          {copy.success.onList}
        </h1>

        {event ? (
          <div className="mt-10 grid gap-8 border-y border-border py-7 sm:grid-cols-2">
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-accent">{copy.common.event}</p>
              <p className="mt-2 font-body text-xl font-semibold">{event.title}</p>
            </div>
            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.14em] text-accent">{copy.common.when}</p>
              <p className="mt-2 font-body text-lg">{dateFormatter.format(new Date(event.date))}</p>
              <p className="mt-1 font-body text-sm text-text-muted">{event.location}</p>
            </div>
          </div>
        ) : (
          <p className="mt-8 max-w-md font-body text-lg leading-relaxed text-text-muted">{copy.success.savedDetails}</p>
        )}

        {registration && (
          <RegistrationPass registrationCode={registration.registration_code} className="mt-8" />
        )}

        {event && (
          <div className="mt-8">
            <AddToCalendarButton title={event.title} date={event.date} location={event.location} />
          </div>
        )}

        <section className="mt-16 border-t border-border pt-8">
          <p className="font-body text-xs font-bold uppercase tracking-[0.22em] text-accent sm:text-sm">
            {copy.success.keepMoving}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <CommunityLink href={COMMUNITY_LINKS.whatsapp} label="WhatsApp" icon={<MessageCircle size={20} />} />
            <CommunityLink href={COMMUNITY_LINKS.strava} label="Strava" icon={<Trophy size={20} />} />
            <CommunityLink href={COMMUNITY_LINKS.instagram} label="Instagram" icon={<Camera size={20} />} />
          </div>
        </section>

        <Link href="/" className={buttonStyles("secondary", "lg", "mt-12")}>
          <ArrowLeft size={18} /> {copy.common.backHome}
        </Link>
      </div>
    </main>
  );
}

function CommunityLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 items-center justify-between rounded-xl border border-border px-4 font-body text-sm font-bold uppercase tracking-[0.12em] transition-colors hover:border-text-muted hover:bg-surface"
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      <ArrowUpRight size={18} />
    </a>
  );
}
