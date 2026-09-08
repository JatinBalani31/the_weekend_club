"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, ScanLine } from "lucide-react";
import type { Event } from "@/lib/events";
import type { AdminRegistration } from "@/lib/registrations";
import type { HeroSlideData } from "@/lib/adminSettings";
import AdminTable from "@/components/AdminTable";
import AdminEventManager from "@/components/AdminEventManager";
import AdminCarousel from "@/components/AdminCarousel";
import copy from "@/content/en.json";

type Tab = "registrations" | "events" | "carousel";

export default function AdminDashboard({ registrations, events, heroSlides }: { registrations: AdminRegistration[]; events: Event[]; heroSlides: HeroSlideData[] }) {
  const [tab, setTab] = useState<Tab>("registrations");

  return (
    <>
      <header className="flex items-start justify-between gap-6 border-b border-border pb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{copy.brand.name}</p>
          <h1 className="mt-3 font-display text-5xl uppercase tracking-[0.01em] sm:text-7xl">{copy.admin.title}</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/checkin" className="flex min-h-11 items-center gap-2 bg-accent px-4 text-xs font-bold uppercase tracking-wider text-bg"><ScanLine size={16} /> Check-in</Link>
          <form action="/api/admin/logout" method="post"><button type="submit" aria-label={copy.navigation.logOut} className="flex min-h-11 items-center gap-2 border border-border px-3 text-xs font-bold uppercase tracking-wider"><LogOut size={16} /> {copy.navigation.logOut}</button></form>
        </div>
      </header>

      <nav className="mt-6 flex gap-2 border-b border-border">
        <TabButton active={tab === "registrations"} onClick={() => setTab("registrations")}>{copy.admin.registrations} ({registrations.length})</TabButton>
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>{copy.admin.events} ({events.length})</TabButton>
        <TabButton active={tab === "carousel"} onClick={() => setTab("carousel")}>Carousel</TabButton>
      </nav>

      {tab === "registrations" && <AdminTable registrations={registrations} />}
      {tab === "events" && <AdminEventManager events={events} registrations={registrations} />}
      {tab === "carousel" && <AdminCarousel initial={heroSlides} />}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-11 border-b-2 px-4 text-xs font-bold uppercase tracking-wider ${active ? "border-accent text-text" : "border-transparent text-text-muted"}`}>
      {children}
    </button>
  );
}
