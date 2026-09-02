"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/Button";
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
      // Taller frame on phones (roughly 4:5) so the headline has room; wider on desktop.
      className="relative isolate aspect-[4/5] max-h-[92svh] min-h-[34rem] w-full overflow-hidden bg-bg text-text md:aspect-[16/9] md:min-h-[38rem]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {slides.map((slide, index) => (
        <div
          aria-hidden={index !== activeIndex}
          className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
          key={slide.headline}
        >
          <Image src={slide.image} alt="" fill priority={index === 0} sizes="100vw" className="object-cover" />
        </div>
      ))}
      {/* Strong at the bottom so the headline stays readable over any photo, clear at the top. */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-between px-5 pb-8 pt-8 sm:px-10 sm:pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end">
          <p className="mb-4 font-body text-xs font-semibold uppercase tracking-[0.22em] text-accent sm:text-sm">
            {copy.home.heroTagline}
          </p>
          <h1 className="max-w-3xl font-display text-[clamp(3rem,13vw,8rem)] uppercase leading-[0.88] tracking-[-0.01em]">
            {slides[activeIndex].headline}
          </h1>
          <div>
            <Link href={slides[activeIndex].ctaHref} className={buttonStyles("primary", "lg", "mt-8")}>
              {slides[activeIndex].ctaText}
              <ArrowUpRight aria-hidden="true" size={18} />
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-8 flex w-full max-w-7xl items-center gap-2" aria-label={copy.home.chooseFeaturedUpdate}>
          {slides.map((slide, index) => (
            <button
              aria-label={`${copy.home.showSlide} ${index + 1}`}
              aria-current={index === activeIndex}
              className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              key={slide.headline}
              onClick={() => showSlide(index)}
              type="button"
            >
              <span
                className={`block h-1.5 w-1.5 rounded-full transition-colors ${index === activeIndex ? "bg-accent" : "bg-text-muted/50"}`}
              />
            </button>
          ))}
          <span className="ml-2 font-body text-xs uppercase tracking-[0.16em] text-text-muted">
            {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </section>
  );
}
