"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/Bits";

export interface HomiSlide {
  eyebrow: string;
  title: string;
  body: string;
}

export const HOMI_WAITING_SLIDES: HomiSlide[] = [
  {
    eyebrow: "Random fact",
    title: "Homing pigeons can navigate 1,800 km home.",
    body: "They use the Earth's magnetic field and a small bias toward roads. Homi just wanted to be the mascot.",
  },
  {
    eyebrow: "Random fact",
    title: "Pigeons recognise themselves in mirrors.",
    body: "They also pass basic shape-sorting tests. The 'rats with wings' meme is rude and statistically wrong.",
  },
  {
    eyebrow: "Random fact",
    title: "A pigeon once saved a thousand soldiers.",
    body: "G.I. Joe flew 32 km in 20 minutes carrying a message that cancelled a bombing in 1943. Homi has not received a medal yet.",
  },
  {
    eyebrow: "Random fact",
    title: "Darwin bred pigeons before writing his book.",
    body: "The first chapter of On the Origin of Species is entirely about pigeon breeding. Homi finds this very validating.",
  },
  {
    eyebrow: "Random fact",
    title: "Pigeons can count up to nine.",
    body: "Lab studies in 2011 showed they distinguish small quantities about as well as primates. Still bad at sharing chips.",
  },
  {
    eyebrow: "Random fact",
    title: "Pigeons mate for life.",
    body: "They co-raise their chicks and recognise each other by voice. They also hold mild grudges. Same.",
  },
  {
    eyebrow: "Random fact",
    title: "Rotterdam has more bikes than people.",
    body: "Roughly 600,000 bikes for 670,000 residents. A solid chunk are currently locked to something that has fallen over.",
  },
];

interface HomiWaitingCarouselProps {
  /** When true, auto-advance pauses (e.g. pipeline error). */
  pausedExternally?: boolean;
}

export function HomiWaitingCarousel({
  pausedExternally = false,
}: HomiWaitingCarouselProps) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = HOMI_WAITING_SLIDES;
  const slide = slides[slideIdx];
  const effectivePaused = paused || pausedExternally;

  useEffect(() => {
    if (effectivePaused) return;
    const t = setTimeout(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, 4200);
    return () => clearTimeout(t);
  }, [slideIdx, effectivePaused, slides.length]);

  useEffect(() => {
    if (!paused) return;
    const t = setTimeout(() => setPaused(false), 7000);
    return () => clearTimeout(t);
  }, [paused, slideIdx]);

  function nudgeSlide(delta: 1 | -1) {
    setPaused(true);
    setSlideIdx((i) => (i + delta + slides.length) % slides.length);
  }

  function jumpSlide(idx: number) {
    setPaused(true);
    setSlideIdx(idx);
  }

  return (
    <>
      <Card
        className="mb-4 relative overflow-hidden cursor-pointer select-none"
        onClick={() => nudgeSlide(1)}
      >
        <div className="absolute top-3 left-5 text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium">
          While Homi works
        </div>
        <button
          type="button"
          aria-label="Previous slide"
          onClick={(e) => {
            e.stopPropagation();
            nudgeSlide(-1);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-full text-[var(--color-muted)] hover:bg-[var(--color-cream-warm)] hover:text-[var(--color-ink)] transition-colors z-10"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={(e) => {
            e.stopPropagation();
            nudgeSlide(1);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-full text-[var(--color-muted)] hover:bg-[var(--color-cream-warm)] hover:text-[var(--color-ink)] transition-colors z-10"
        >
          <ChevronRight size={16} />
        </button>

        <div className="px-10 pt-9 pb-2 min-h-[160px]">
          <div key={slideIdx} className="animate-fade-in-soft">
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-sage-deep)] font-medium mb-1.5">
              {slide.eyebrow}
            </p>
            <p className="display text-[19px] leading-snug mb-2">{slide.title}</p>
            <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
              {slide.body}
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-line)] overflow-hidden">
          <div
            key={`bar-${slideIdx}-${effectivePaused}`}
            className={
              "h-full bg-[var(--color-sage)] origin-left " +
              (effectivePaused ? "" : "animate-slide-fill")
            }
          />
        </div>
      </Card>

      <div className="flex items-center justify-center gap-1.5 mb-5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === slideIdx}
            onClick={() => jumpSlide(i)}
            className={
              "h-1.5 rounded-full transition-all " +
              (i === slideIdx
                ? "w-6 bg-[var(--color-ink)]"
                : "w-1.5 bg-[var(--color-line)] hover:bg-[var(--color-muted)]")
            }
          />
        ))}
      </div>
    </>
  );
}
