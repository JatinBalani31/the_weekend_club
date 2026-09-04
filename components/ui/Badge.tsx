import type { EventType } from "@/lib/events";

// Each event type reads distinctly but stays inside the palette.
const VARIANT_STYLES: Record<EventType, string> = {
  run: "bg-accent text-bg",
  workshop: "border border-border bg-surface-hover text-text",
  music: "border border-accent/30 bg-accent/15 text-accent",
};

type BadgeProps = {
  variant?: EventType;
  className?: string;
  children: React.ReactNode;
};

export default function Badge({ variant = "run", className = "", children }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 font-body text-[11px] font-bold uppercase tracking-[0.12em]",
        VARIANT_STYLES[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
