"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/events";
import type { AdminRegistration } from "@/lib/registrations";
import EventForm from "@/components/EventForm";
import copy from "@/content/en.json";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function AdminEventManager({ events, registrations }: { events: Event[]; registrations: AdminRegistration[] }) {
  const router = useRouter();
  const [editingEvent, setEditingEvent] = useState<Event | "new" | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const registrationCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const registration of registrations) {
      if (!registration.event) continue;
      map.set(registration.event.id, (map.get(registration.event.id) ?? 0) + 1);
    }
    return map;
  }, [registrations]);

  async function toggleActive(event: Event) {
    setPendingId(event.id);
    setError(null);
    const response = await fetch(`/api/admin/events/${event.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !event.is_active }) });
    const result = await response.json();
    setPendingId(null);
    if (!response.ok) { setError(result.error ?? copy.admin.couldNotUpdate); return; }
    router.refresh();
  }

  async function deleteEvent(event: Event) {
    if (!window.confirm(copy.admin.deleteConfirm.replace("{title}", event.title))) return;
    setPendingId(event.id);
    setError(null);
    const response = await fetch(`/api/admin/events/${event.id}`, { method: "DELETE" });
    const result = await response.json();
    setPendingId(null);
    if (!response.ok) { setError(result.error ?? copy.admin.couldNotDelete); return; }
    router.refresh();
  }

  if (editingEvent) {
    return <EventForm event={editingEvent === "new" ? undefined : editingEvent} onClose={() => setEditingEvent(null)} />;
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between border-b border-ink/15 pb-4">
        <p className="text-sm text-ink/55">{events.length} {events.length === 1 ? copy.admin.eventTotal : copy.admin.eventsTotal} total</p>
        <button type="button" onClick={() => setEditingEvent("new")} className="min-h-11 bg-accent px-4 text-xs font-bold uppercase tracking-wider text-ink">{copy.admin.newEvent}</button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead><tr className="border-b border-ink/20 text-xs uppercase tracking-wider text-ink/50">{["Title", "Date", "Type", "Price", "Capacity", "Registered", "Status", ""].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}</tr></thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-ink/10">
                <td className="px-3 py-4 font-bold">{event.title}</td>
                <td className="px-3 py-4">{dateFormatter.format(new Date(event.date))}</td>
                <td className="px-3 py-4 capitalize">{event.event_type}</td>
                <td className="px-3 py-4">{event.price > 0 ? `INR ${event.price}` : copy.common.free}</td>
                <td className="px-3 py-4">{event.capacity}</td>
                <td className="px-3 py-4">{registrationCounts.get(event.id) ?? 0}</td>
                <td className="px-3 py-4"><span className={event.is_active ? "text-green-700" : "text-ink/45"}>{event.is_active ? copy.admin.active : copy.admin.inactive}</span></td>
                <td className="px-3 py-4">
                  <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-wider">
                    <button type="button" onClick={() => setEditingEvent(event)} className="min-h-11 underline">{copy.admin.edit}</button>
                    <button type="button" disabled={pendingId === event.id} onClick={() => toggleActive(event)} className="min-h-11 underline disabled:opacity-50">{event.is_active ? "Deactivate" : "Activate"}</button>
                    <button type="button" disabled={pendingId === event.id} onClick={() => deleteEvent(event)} className="min-h-11 text-red-700 underline disabled:opacity-50">{copy.admin.delete}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p className="border-b border-ink/10 py-8 text-sm text-ink/55">{copy.admin.noEvents}</p>}
      </div>
    </section>
  );
}
