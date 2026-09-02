"use client";

import { useMemo } from "react";
import type { AdminRegistration } from "@/lib/registrations";

export default function AdminSummary({ registrations }: { registrations: AdminRegistration[] }) {
  const totals = useMemo(() => {
    const paid = registrations.filter((item) => item.payment_status === "paid").length;
    const pending = registrations.filter((item) => item.payment_status === "pending").length;
    const failed = registrations.filter((item) => item.payment_status === "failed").length;
    return { total: registrations.length, paid, pending, failed };
  }, [registrations]);

  const byEvent = useMemo(() => {
    const map = new Map<string, { title: string; total: number; paid: number }>();
    for (const item of registrations) {
      const key = item.event?.id ?? "unknown";
      const title = item.event?.title ?? "Unknown event";
      const entry = map.get(key) ?? { title, total: 0, paid: 0 };
      entry.total += 1;
      if (item.payment_status === "paid") entry.paid += 1;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [registrations]);

  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total" value={totals.total} />
        <SummaryCard label="Paid" value={totals.paid} accent />
        <SummaryCard label="Pending" value={totals.pending} />
        <SummaryCard label="Failed" value={totals.failed} />
      </div>
      {byEvent.length > 0 && (
        <div className="mt-6 border border-border">
          <p className="border-b border-border bg-bg px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-muted">By event</p>
          <ul className="divide-y divide-border">
            {byEvent.map((entry) => (
              <li key={entry.title} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-bold">{entry.title}</span>
                <span className="text-text-muted">{entry.paid} paid / {entry.total} total</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border border-border p-4">
      <p className={`font-display text-3xl  ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-text-muted">{label}</p>
    </div>
  );
}
