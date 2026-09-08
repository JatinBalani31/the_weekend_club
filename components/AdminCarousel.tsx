"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, GripVertical } from "lucide-react";
import type { HeroSlideData } from "@/lib/adminSettings";

const EMPTY_SLIDE: HeroSlideData = { image: "", headline: "", ctaText: "", ctaHref: "" };

export default function AdminCarousel({ initial }: { initial: HeroSlideData[] }) {
  const router = useRouter();
  const [slides, setSlides] = useState<HeroSlideData[]>(initial.length > 0 ? initial : [{ ...EMPTY_SLIDE }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateSlide(index: number, field: keyof HeroSlideData, value: string) {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    setSuccess(false);
  }

  function addSlide() {
    setSlides((prev) => [...prev, { ...EMPTY_SLIDE }]);
    setSuccess(false);
  }

  function removeSlide(index: number) {
    setSlides((prev) => prev.filter((_, i) => i !== index));
    setSuccess(false);
  }

  function moveSlide(from: number, to: number) {
    setSlides((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSuccess(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const response = await fetch("/api/admin/carousel", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(result.error ?? "Could not save carousel.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <p className="text-sm text-text-muted">{slides.length} slide{slides.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-3">
          <button type="button" onClick={addSlide} className="flex min-h-11 items-center gap-2 border border-border px-4 text-xs font-bold uppercase tracking-wider">
            <ImagePlus size={16} /> Add slide
          </button>
          <button type="button" onClick={save} disabled={saving} className="min-h-11 bg-accent px-4 text-xs font-bold uppercase tracking-wider text-bg disabled:opacity-50">
            {saving ? "Saving..." : "Save carousel"}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
      {success && <p className="mt-4 text-sm text-success">Carousel saved.</p>}

      <div className="mt-5 space-y-6">
        {slides.map((slide, index) => (
          <div key={index} className="rounded-xl border border-border p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-body text-xs font-bold uppercase tracking-wider text-text-muted">Slide {index + 1}</span>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button type="button" onClick={() => moveSlide(index, index - 1)} title="Move up" className="flex h-9 w-9 items-center justify-center border border-border text-text-muted hover:text-text">
                    <GripVertical size={14} />
                  </button>
                )}
                {slides.length > 1 && (
                  <button type="button" onClick={() => removeSlide(index)} title="Remove slide" className="flex h-9 w-9 items-center justify-center border border-border text-error hover:bg-error/10">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Image URL</label>
                <input
                  type="url"
                  value={slide.image}
                  onChange={(e) => updateSlide(index, "image", e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="min-h-11 w-full border border-border bg-surface px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Headline</label>
                <input
                  type="text"
                  value={slide.headline}
                  onChange={(e) => updateSlide(index, "headline", e.target.value)}
                  placeholder="Find your pace."
                  className="min-h-11 w-full border border-border bg-surface px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Button text</label>
                <input
                  type="text"
                  value={slide.ctaText}
                  onChange={(e) => updateSlide(index, "ctaText", e.target.value)}
                  placeholder="See upcoming runs"
                  className="min-h-11 w-full border border-border bg-surface px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Button link</label>
                <input
                  type="text"
                  value={slide.ctaHref}
                  onChange={(e) => updateSlide(index, "ctaHref", e.target.value)}
                  placeholder="/events"
                  className="min-h-11 w-full border border-border bg-surface px-3 text-sm"
                />
              </div>
            </div>

            {slide.image && (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.image} alt="Preview" className="h-32 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
