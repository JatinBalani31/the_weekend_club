"use client";

import { CalendarPlus } from "lucide-react";
import copy from "@/content/en.json";

type AddToCalendarButtonProps = { title: string; date: string; location: string };

function escapeIcs(value: string) {
  return value.replace(/[\\;,]/g, (character) => `\\${character}`).replace(/\n/g, "\\n");
}

export default function AddToCalendarButton({ title, date, location }: AddToCalendarButtonProps) {
  function downloadCalendarFile() {
    const start = new Date(date);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const formatDate = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const calendar = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//the Weekend Club//EN", "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}@theweekendclub`, `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(start)}`, `DTEND:${formatDate(end)}`, `SUMMARY:${escapeIcs(title)}`,
      `LOCATION:${escapeIcs(location)}`, `DESCRIPTION:${copy.brand.name} event`, "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <button type="button" onClick={downloadCalendarFile} className="flex min-h-12 items-center gap-3 border border-border px-5 text-sm font-bold uppercase tracking-wider"><CalendarPlus size={18} /> {copy.success.addToCalendar}</button>;
}