"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import type { Event } from "@/lib/events";
import type { AdminRegistration } from "@/lib/registrations";
import AdminTable from "@/components/AdminTable";
import AdminEventManager from "@/components/AdminEventManager";
import copy from "@/content/en.json";

type Tab = "registrations" | "events";

export default function AdminDashboard({ registrations, events }: { registrations: AdminRegistration[]; events: Event[] }) {
  const [tab, setTab] = useState<Tab>("registrations");

  return (
    <>
      <header className="flex items-start justify-between gap-6 border-b border-ink/15 pb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{copy.brand.name}</p>
          <h1 className="mt-3 font-display text-5xl font-black uppercase tracking-[-0.04em] sm:text-7xl">{copy.admin.title}</h1>
        </div>
        <form action="/api/admin/logout" method="post"><button type="submit" aria-label={copy.navigation.logOut} className="flex min-h-11 items-center gap-2 border border-ink/20 px-3 text-xs font-bold uppercase tracking-wider"><LogOut size={16} /> {copy.navigation.logOut}</button></form>
      </header>

      <nav className="mt-6 flex gap-2 border-b border-ink/15">
        <TabButton active={tab === "registrations"} onClick={() => setTab("registrations")}>{copy.admin.registrations} ({registrations.length})</TabButton>
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>{copy.admin.events} ({events.length})</TabButton>
      </nav>

      {tab === "registrations" ? <AdminTable registrations={registrations} /> : <AdminEventManager events={events} registrations={registrations} />}
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-11 border-b-2 px-4 text-xs font-bold uppercase tracking-wider ${active ? "border-accent text-ink" : "border-transparent text-ink/45"}`}>
      {children}
    </button>
  );
}
