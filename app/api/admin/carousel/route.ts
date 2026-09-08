import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin";
import { getHeroSlides, saveHeroSlides, type HeroSlideData } from "@/lib/adminSettings";

export async function GET() {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const slides = await getHeroSlides();
  return NextResponse.json({ slides: slides ?? [] });
}

export async function PUT(request: Request) {
  if (!(await isAdminRequestAuthorized())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const slides = body.slides as unknown;
  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json({ error: "Provide at least one slide." }, { status: 400 });
  }

  const parsed: HeroSlideData[] = [];
  for (const slide of slides) {
    const image = typeof slide.image === "string" ? slide.image.trim() : "";
    const headline = typeof slide.headline === "string" ? slide.headline.trim() : "";
    const ctaText = typeof slide.ctaText === "string" ? slide.ctaText.trim() : "";
    const ctaHref = typeof slide.ctaHref === "string" ? slide.ctaHref.trim() : "";
    if (!image || !headline) {
      return NextResponse.json({ error: "Each slide needs an image URL and headline." }, { status: 400 });
    }
    parsed.push({ image, headline, ctaText, ctaHref });
  }

  const ok = await saveHeroSlides(parsed);
  if (!ok) return NextResponse.json({ error: "Could not save carousel." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
