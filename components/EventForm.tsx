"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Event, EventType, TicketTier } from "@/lib/events";
import copy from "@/content/en.json";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fieldStyles, fieldErrorStyles } from "@/components/ui/Input";
import { istDatetimeLocalToUtcIso, utcIsoToIstDatetimeLocal } from "@/lib/dateTime";

type TierRow = { name: string; price: string; capacity: string; sale_ends_at: string; is_active: boolean };

function tiersToRows(tiers: TicketTier[] | undefined): TierRow[] {
  return (tiers ?? []).map((tier) => ({
    name: tier.name,
    price: String(tier.price),
    capacity: String(tier.capacity),
    sale_ends_at: tier.sale_ends_at ? utcIsoToIstDatetimeLocal(tier.sale_ends_at) : "",
    is_active: tier.is_active,
  }));
}

export default function EventForm({ event, onClose }: { event?: Event; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [bannerImageUrl, setBannerImageUrl] = useState(event?.banner_image_url ?? "");
  const [date, setDate] = useState(event ? utcIsoToIstDatetimeLocal(event.date) : "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [price, setPrice] = useState(event ? String(event.price) : "0");
  const [capacity, setCapacity] = useState(event ? String(event.capacity) : "50");
  const [eventType, setEventType] = useState<EventType>(event?.event_type ?? "run");
  const [isActive, setIsActive] = useState(event?.is_active ?? true);
  const [tiers, setTiers] = useState<TierRow[]>(tiersToRows(event?.ticket_tiers));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageStatus, setImageStatus] = useState<"idle" | "ok" | "error">("idle");

  function updateTier(index: number, patch: Partial<TierRow>) {
    setTiers((current) => current.map((tier, tierIndex) => (tierIndex === index ? { ...tier, ...patch } : tier)));
  }

  function addTier() {
    setTiers((current) => [...current, { name: "", price: "0", capacity: "20", sale_ends_at: "", is_active: true }]);
  }

  function removeTier(index: number) {
    setTiers((current) => current.filter((_, tierIndex) => tierIndex !== index));
  }

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const body = {
      title,
      description,
      banner_image_url: bannerImageUrl,
      date: date ? istDatetimeLocalToUtcIso(date) : "",
      location,
      price: Number(price),
      capacity: Number(capacity),
      event_type: eventType,
      is_active: isActive,
      ticket_tiers: tiers.map((tier) => ({ name: tier.name, price: Number(tier.price), capacity: Number(tier.capacity), sale_ends_at: tier.sale_ends_at ? istDatetimeLocalToUtcIso(tier.sale_ends_at) : null, is_active: tier.is_active })),
    };

    const response = await fetch(event ? `/api/admin/events/${event.id}` : "/api/admin/events", {
      method: event ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setIsSubmitting(false);
    if (!response.ok) { setError(result.error ?? copy.eventForm.saveError); return; }
    router.refresh();
    onClose();
  }

  return (
    <Card><form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl uppercase">{event ? copy.eventForm.edit : copy.eventForm.new}</h3>
        <button type="button" onClick={onClose} className="min-h-11 px-3 text-xs font-bold uppercase tracking-wider text-text-muted">{copy.eventForm.cancel}</button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} required className={fieldStyles} /></Field>
        <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} required className={fieldStyles} /></Field>
        <Field label="Date and time (IST)"><input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required className={fieldStyles} /></Field>
        <Field label="Event type">
          <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)} className={fieldStyles}>
            <option value="run">Run</option>
            <option value="workshop">Workshop</option>
            <option value="music">Music</option>
          </select>
        </Field>
        <Field label="Price (INR)"><input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className={fieldStyles} /></Field>
        <Field label="Capacity"><input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} required className={fieldStyles} /></Field>
        <Field label={copy.eventForm.bannerUrl} full>
          <input
            type="url"
            value={bannerImageUrl}
            onChange={(e) => { setBannerImageUrl(e.target.value); setImageStatus("idle"); }}
            required
            className={fieldStyles}
            placeholder={copy.eventForm.httpsPlaceholder}
          />
          <span className="mt-2 block text-[11px] font-medium normal-case tracking-normal text-text-muted">{copy.eventForm.bannerHint}</span>
          {bannerImageUrl && (
            <span className="mt-3 block">
              <span className="relative block aspect-[16/9] w-full max-w-xs overflow-hidden border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- live admin preview of an arbitrary external URL, not an optimized site asset */}
                <img
                  src={bannerImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onLoad={() => setImageStatus("ok")}
                  onError={() => setImageStatus("error")}
                />
              </span>
              {imageStatus === "error" && <span className={`${fieldErrorStyles} normal-case`}>{copy.eventForm.bannerInvalid}</span>}
              {imageStatus === "ok" && <span className="mt-2 block text-[11px] font-bold uppercase tracking-wider text-success">{copy.eventForm.bannerValid}</span>}
            </span>
          )}
        </Field>
        <Field label="Description" full><textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} className={fieldStyles} /></Field>
      </div>

      <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-accent" />
        Visible to the public
      </label>

      <div className="mt-6 border-t border-border pt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Ticket tiers <span className="text-text-muted">(optional — leave empty for a single flat price)</span></p>
          <button type="button" onClick={addTier} className="min-h-11 border border-border px-3 text-xs font-bold uppercase tracking-wider">Add tier</button>
        </div>
        {tiers.map((tier, index) => (
          <div key={index} className="mt-4 grid gap-3 border border-border p-3 sm:grid-cols-5">
            <input value={tier.name} onChange={(e) => updateTier(index, { name: e.target.value })} placeholder="Name" required className={`${fieldStyles} sm:col-span-2`} />
            <input type="number" min="0" step="0.01" value={tier.price} onChange={(e) => updateTier(index, { price: e.target.value })} placeholder="Price" required className={fieldStyles} />
            <input type="number" min="1" value={tier.capacity} onChange={(e) => updateTier(index, { capacity: e.target.value })} placeholder="Capacity" required className={fieldStyles} />
            <input type="datetime-local" value={tier.sale_ends_at} onChange={(e) => updateTier(index, { sale_ends_at: e.target.value })} className={fieldStyles} />
            <div className="flex items-center justify-between gap-3 sm:col-span-5">
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={tier.is_active} onChange={(e) => updateTier(index, { is_active: e.target.checked })} className="h-4 w-4 accent-accent" /> Active</label>
              <button type="button" onClick={() => removeTier(index)} className="min-h-11 text-xs font-bold uppercase tracking-wider text-error">Remove</button>
            </div>
          </div>
        ))}
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl border border-error/40 bg-error/10 p-4 font-body text-sm text-error">{error}</p>}
      <Button type="submit" size="lg" isLoading={isSubmitting} className="mt-6 w-full">{isSubmitting ? "Saving..." : event ? "Save changes" : copy.eventForm.create}</Button>
    </form></Card>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`block text-xs font-bold uppercase tracking-wider text-text-muted ${full ? "sm:col-span-2" : ""}`}>{label}<span className="mt-2 block">{children}</span></label>;
}
