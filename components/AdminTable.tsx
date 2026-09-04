"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import type { AdminRegistration } from "@/lib/registrations";
import AdminSummary from "@/components/AdminSummary";
import copy from "@/content/en.json";
import { eventDateTimeShortFormatter as dateFormatter } from "@/lib/dateTime";


export default function AdminTable({ registrations }: { registrations: AdminRegistration[] }) {
  const [eventFilter, setEventFilter] = useState("all");
  const events = useMemo(() => Array.from(new Map(registrations.filter((item) => item.event).map((item) => [item.event!.id, item.event!.title])).entries()), [registrations]);
  const filtered = eventFilter === "all" ? registrations : registrations.filter((item) => item.event?.id === eventFilter);

  function exportExcel() {
    const rows = filtered.map((item) => ({
      "Registration no": item.registration_code,
      Name: item.name,
      Email: item.email,
      Phone: item.phone,
      "Strava handle": item.strava_handle ?? "",
      Event: item.event?.title ?? "",
      "Ticket tier": item.ticket_tier?.name ?? "",
      "Amount (INR)": item.charged_price ?? "",
      "Payment status": item.payment_status,
      "Email updates": item.email_updates ? "Yes" : "No",
      "Date registered": dateFormatter.format(new Date(item.created_at)),
    }));

    const summaryRows = Array.from(new Map(filtered.filter((item) => item.event).map((item) => [item.event!.id, item.event!.title])).values()).map((title) => {
      const eventRegistrations = filtered.filter((item) => item.event?.title === title);
      return { Event: title, Total: eventRegistrations.length, Paid: eventRegistrations.filter((item) => item.payment_status === "paid").length, Pending: eventRegistrations.filter((item) => item.payment_status === "pending").length };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Registrations");
    XLSX.writeFile(workbook, "weekend-club-registrations.xlsx");
  }

  return (
    <section className="mt-8">
      <AdminSummary registrations={filtered} />
      <div className="mt-8 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Filter by event<select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="ml-3 min-h-11 border border-border bg-surface px-3 text-sm font-normal normal-case tracking-normal"><option value="all">All events</option>{events.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
        <button type="button" onClick={exportExcel} className="min-h-11 border border-border px-4 text-xs font-bold uppercase tracking-wider">{copy.admin.export}</button>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead><tr className="border-b border-border text-xs uppercase tracking-wider text-text-muted">{[copy.admin.table.registrationNo, "Name", "Email", "Phone", "Event", "Tier", "Amount", "Status", "Updates", "Registered"].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}</tr></thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-border">
                <td className="px-3 py-4 font-mono text-xs uppercase tracking-wider text-accent">{item.registration_code}</td>
                <td className="px-3 py-4 font-bold">{item.name}</td>
                <td className="px-3 py-4">{item.email}</td>
                <td className="px-3 py-4">{item.phone}</td>
                <td className="px-3 py-4">{item.event?.title ?? "Unknown event"}</td>
                <td className="px-3 py-4">{item.ticket_tier?.name ?? "—"}</td>
                <td className="px-3 py-4">{item.charged_price != null ? `INR ${item.charged_price}` : "—"}</td>
                <td className="px-3 py-4 uppercase tracking-wider"><span className={item.payment_status === "paid" ? "text-success" : "text-text-muted"}>{item.payment_status}</span></td>
                <td className="px-3 py-4">{item.email_updates ? "Yes" : "No"}</td>
                <td className="px-3 py-4">{dateFormatter.format(new Date(item.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="border-b border-border py-8 text-sm text-text-muted">{copy.admin.noRegistrations}</p>}
      </div>
    </section>
  );
}
