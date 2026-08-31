"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import copy from "@/content/en.json";

export type HeroSlide = {
  image: string;
  headline: string;
  ctaText: string;
  ctaHref: string;
};

type HeroCarouselProps = { slides: HeroSlide[] };
const AUTOPLAY_DELAY = 5000;
const RESUME_DELAY = 7000;

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused || slides.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_DELAY);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  function pauseAndResume() {
    setIsPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setIsPaused(false), RESUME_DELAY);
  }

  function showSlide(index: number) {
    setActiveIndex(index);
    pauseAndResume();
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0].clientX;
    pauseAndResume();
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(distance) > 48) {
      setActiveIndex((current) =>
        distance < 0 ? (current + 1) % slides.length : (current - 1 + slides.length) % slides.length,
      );
    }
    touchStartX.current = null;
  }

  return (
    <section
      aria-label={copy.home.featuredUpdates}
      className="relative isolate min-h-[min(720px,92svh)] overflow-hidden bg-ink text-paper"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {slides.map((slide, index) => (
        <div aria-hidden={index !== activeIndex} className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`} key={slide.headline}>
          <Image src={slide.image} alt="" fill priority={index === 0} sizes="100vw" className="object-cover" />
        </div>
      ))}
      <div className="absolute inset-0 -z-0 bg-gradient-to-t from-ink via-ink/35 to-ink/10" />
      <div className="relative z-10 mx-auto flex min-h-[min(720px,92svh)] max-w-7xl flex-col justify-between px-5 pb-8 pt-6 sm:px-10 sm:pb-12">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-accent">{copy.home.heroTagline}</p>
          <h1 className="max-w-2xl font-display text-[clamp(3.5rem,14vw,8.5rem)] font-black uppercase leading-[0.85] tracking-[-0.06em]">{slides[activeIndex].headline}</h1>
          <Link href={slides[activeIndex].ctaHref} className="mt-8 inline-flex min-h-12 items-center justify-center bg-accent px-6 text-sm font-bold uppercase tracking-[0.12em] text-ink transition-transform active:scale-95">{slides[activeIndex].ctaText}<span aria-hidden="true" className="ml-4 text-lg">↗</span></Link>
        </div>
        <div className="flex items-center gap-3" aria-label={copy.home.chooseFeaturedUpdate}>
          {slides.map((slide, index) => <button aria-label={`${copy.home.showSlide} ${index + 1}`} aria-current={index === activeIndex} className={`h-11 w-11 p-3 ${index === activeIndex ? "" : "opacity-60"}`} key={slide.headline} onClick={() => showSlide(index)} type="button"><span className={`block h-1 w-full ${index === activeIndex ? "bg-accent" : "bg-paper"}`} /></button>)}
          <span className="ml-2 text-xs uppercase tracking-[0.16em] text-paper/70">{String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
        </div>
      </div>
    </section>
  );
}