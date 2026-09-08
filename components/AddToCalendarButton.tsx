import { CalendarPlus } from "lucide-react";
import copy from "@/content/en.json";

type AddToCalendarButtonProps = { title: string; date: string; location: string };

function toGoogleCalendarDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export default function AddToCalendarButton({ title, date, location }: AddToCalendarButtonProps) {
  const start = toGoogleCalendarDate(date);
  const end = toGoogleCalendarDate(new Date(new Date(date).getTime() + 60 * 60 * 1000).toISOString());

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${start}/${end}`);
  url.searchParams.set("location", location);
  url.searchParams.set("details", `${copy.brand.name} event`);

  return (
    <a
      href={url.toString()}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-12 items-center gap-3 rounded-xl border border-border px-5 font-body text-sm font-bold uppercase tracking-wider transition-colors hover:border-text-muted hover:bg-surface"
    >
      <CalendarPlus size={18} /> {copy.success.addToCalendar}
    </a>
  );
}
