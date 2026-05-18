"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Cloud,
  Cpu,
  Check,
  ChevronLeft,
  ChevronRight,
  Quote,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, PrimaryButton } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import { BreathingOrb } from "@/components/Loading";
import { useApp } from "@/lib/store";
import { takeAudio } from "@/lib/audioStash";

type Stage = 0 | 1 | 2 | 3 | 4; // idle / transcribing / analyzing / ready / error

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: "The shape",
    title: "Activity first. Profile never.",
    body: "HOMING starts from what you actually enjoy, not who you'd like to meet. No swiping, no profile browsing, no popularity scores.",
  },
  {
    eyebrow: "Random fact",
    title: "Homing pigeons can navigate 1,800 km home.",
    body: "They use the Earth's magnetic field and a small bias toward roads. Homi just wanted to be the mascot.",
  },
  {
    eyebrow: "Anonymous matching",
    title: "Verified before details.",
    body: "Names, photos, and the exact venue stay hidden until everyone in the group passes a quick check.",
  },
  {
    eyebrow: "Random fact",
    title: "Pigeons recognise themselves in mirrors.",
    body: "They also pass basic shape-sorting tests. The 'rats with wings' meme is rude and statistically wrong.",
  },
  {
    eyebrow: "Atomic by design",
    title: "Cooking and Korean food are two different topics.",
    body: "Each interest stands on its own. Edit, hide, or remove anything Homi heard — your call.",
  },
  {
    eyebrow: "Random fact",
    title: "A pigeon once saved a thousand soldiers.",
    body: "G.I. Joe flew 32 km in 20 minutes carrying a message that cancelled a bombing in 1943. Homi has not received a medal yet.",
  },
  {
    eyebrow: "Quiet by default",
    title: "You only edit the activity.",
    body: "Homi handles who to ask. Declines are private. Nobody gets a notification because you said no.",
  },
  {
    eyebrow: "Random fact",
    title: "Darwin bred pigeons before writing his book.",
    body: "The first chapter of On the Origin of Species is entirely about pigeon breeding. Homi finds this very validating.",
  },
  {
    eyebrow: "Privacy by design",
    title: "Audio never leaves your phone.",
    body: "In the production build, transcription runs on-device. We don't store ID documents, selfies, or your legal name.",
  },
  {
    eyebrow: "Random fact",
    title: "Erasmus wrote a book on friendship in 1500.",
    body: "It runs over 800 pages. We're basically the app version, minus the Latin and the elaborate insults.",
  },
  {
    eyebrow: "Success",
    title: "Built to be deleted.",
    body: "A good outcome is the group keeps meeting without us. We measure for that, not screen time.",
  },
  {
    eyebrow: "Random fact",
    title: "Rotterdam has more bikes than people.",
    body: "Roughly 600,000 bikes for 670,000 residents. A solid chunk are currently locked to something that has fallen over.",
  },
];

interface StageChipProps {
  label: string;
  active: boolean;
  done: boolean;
}

function StageChip({ label, active, done }: StageChipProps) {
  return (
    <div
      className={
        "flex items-center gap-1.5 transition-colors duration-300 " +
        (done || active
          ? "text-[var(--color-sage-deep)]"
          : "text-[var(--color-muted)]")
      }
    >
      <span
        className={
          "grid place-items-center h-5 w-5 rounded-full transition-colors duration-300 " +
          (done
            ? "bg-[var(--color-sage)] text-white"
            : active
              ? "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]"
              : "bg-[var(--color-cream-warm)] text-[var(--color-muted)]")
        }
      >
        {done ? (
          <Check size={11} strokeWidth={3} className="animate-pop-check" />
        ) : active ? (
          <span
            className="animate-spin-soft"
            style={{ width: 10, height: 10 }}
            aria-hidden
          />
        ) : (
          <span className="block h-1 w-1 rounded-full bg-current opacity-50" />
        )}
      </span>
      <span className="text-[12px] font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <span
      className={
        "block h-px w-5 transition-colors duration-300 " +
        (active ? "bg-[var(--color-sage)]" : "bg-[var(--color-line)]")
      }
    />
  );
}

export default function TranscribingPage() {
  return (
    <Suspense fallback={null}>
      <Transcribing />
    </Suspense>
  );
}

function Transcribing() {
  const router = useRouter();
  const params = useSearchParams();
  const isSample = params.get("sample") === "1";
  const isLive = params.get("live") === "1";
  const {
    state,
    loadSampleVoice,
    setLiveProfile,
    setLiveTranscript,
  } = useApp();

  const [stage, setStage] = useState<Stage>(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Carousel auto-advance, pauses if user interacts or when stage is terminal.
  useEffect(() => {
    if (paused) return;
    if (stage === 4) return;
    const t = setTimeout(() => {
      setSlideIdx((i) => (i + 1) % SLIDES.length);
    }, 4200);
    return () => clearTimeout(t);
  }, [slideIdx, paused, stage]);

  // Resume auto-advance shortly after a manual interaction.
  useEffect(() => {
    if (!paused) return;
    const t = setTimeout(() => setPaused(false), 7000);
    return () => clearTimeout(t);
  }, [paused, slideIdx]);

  // Auto-advance to /themes once the pipeline is ready. Short delay so the
  // user sees the "Themes ready" state land. Tapping Review themes skips it.
  useEffect(() => {
    if (stage !== 3) return;
    const t = setTimeout(() => router.push("/themes"), 1200);
    return () => clearTimeout(t);
  }, [stage, router]);

  // Pipeline. Runs once on mount.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (isSample) {
      if (state.topics.length === 0) loadSampleVoice();
      runFakeProgression();
      return;
    }

    if (isLive) {
      const audio = takeAudio();
      if (!audio) {
        // Reload or direct nav with no blob in memory — graceful fall-back.
        if (state.transcript || state.topics.length > 0) {
          runFakeProgression();
        } else {
          loadSampleVoice();
          runFakeProgression();
        }
        return;
      }
      runRealPipeline(audio.blob, audio.demoMode);
      return;
    }

    // Direct navigation, no flags.
    if (state.topics.length === 0) loadSampleVoice();
    runFakeProgression();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runFakeProgression() {
    setStage(1);
    setTimeout(() => setStage(2), 1100);
    setTimeout(() => setStage(3), 2300);
  }

  async function runRealPipeline(blob: Blob, demoMode: boolean) {
    setStage(1);
    let transcript = "";
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const r = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!r.ok) throw new Error(`transcribe ${r.status}`);
      const data = (await r.json()) as { text?: string };
      transcript = (data.text || "").trim();
      if (!transcript) throw new Error("empty transcript");
    } catch (e) {
      console.error("Transcribe failed", e);
      setErrMsg(
        "We couldn't reach the transcription service. Use the sample recording to keep going.",
      );
      setStage(4);
      return;
    }

    // Seed keyword fallback so the next screen always has data.
    setLiveTranscript(transcript);
    setStage(2);

    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, demoMode }),
      });
      if (r.ok) {
        const analysis = (await r.json()) as {
          topics: { title: string; explanation: string; tags: string[] }[];
          minor_interests?: string[];
          languages?: string[];
          activity_types?: string[];
          activities?: Parameters<typeof setLiveProfile>[1]["activities"];
        };
        if (analysis.topics?.length > 0) {
          setLiveProfile(transcript, {
            topics: analysis.topics,
            minor_interests: analysis.minor_interests ?? [],
            languages: analysis.languages ?? [],
            activity_types: analysis.activity_types ?? [],
            activities: analysis.activities ?? [],
          });
        }
      } else {
        console.warn("Analyze failed, keeping keyword fallback", r.status);
      }
    } catch (e) {
      console.warn("Analyze threw, keeping keyword fallback", e);
    }

    setStage(3);
  }

  function nudgeSlide(delta: 1 | -1) {
    setPaused(true);
    setSlideIdx((i) => (i + delta + SLIDES.length) % SLIDES.length);
  }

  function jumpSlide(idx: number) {
    setPaused(true);
    setSlideIdx(idx);
  }

  const stageLabel = (() => {
    if (stage === 0) return "Starting…";
    if (stage === 1) return isLive ? "Homi is transcribing…" : "Working on your phone…";
    if (stage === 2) return "Homi is reading your transcript…";
    if (stage === 3) return "Themes ready";
    if (stage === 4) return "Something went wrong";
    return "";
  })();

  const transcriptPreview = (state.transcript || "")
    .trim()
    .split(/\s+/)
    .slice(0, 22)
    .join(" ");

  const slide = SLIDES[slideIdx];
  const isError = stage === 4;
  const isReady = stage === 3;

  return (
    <AppShell back="/voice" title={isLive ? "Transcription" : "On-device transcription"}>
      {/* Top: dynamic 3-stage status row */}
      <div
        className="flex items-center justify-center gap-2 mb-5 px-2 py-3 rounded-2xl bg-[var(--color-paper)] border border-[var(--color-line)]"
        aria-live="polite"
      >
        <StageChip
          label="Transcribe"
          active={stage === 1}
          done={stage >= 2}
        />
        <Connector active={stage >= 2} />
        <StageChip
          label="Analyze"
          active={stage === 2}
          done={stage >= 3}
        />
        <Connector active={stage >= 3} />
        <StageChip label="Ready" active={false} done={stage >= 3} />
      </div>

      {/* Live status label */}
      <p
        className={
          "text-center text-[13.5px] mb-4 transition-colors " +
          (isReady
            ? "text-[var(--color-sage-deep)]"
            : isError
              ? "text-[var(--color-clay)]"
              : "text-[var(--color-ink-soft)]")
        }
      >
        {stageLabel}
      </p>

      {/* Pigeon in breathing orb */}
      <div className="relative h-36 mb-5">
        <BreathingOrb>
          <div className="animate-float">
            <Pigeon size={88} />
          </div>
        </BreathingOrb>
      </div>

      {/* Error state replaces the carousel */}
      {isError ? (
        <Card className="mb-5 flex items-start gap-3 border-[var(--color-clay)]">
          <span className="grid place-items-center h-8 w-8 rounded-full bg-[var(--color-clay-soft)] text-[#7d4730] shrink-0">
            <AlertCircle size={16} />
          </span>
          <div>
            <p className="text-[14px] font-medium mb-1">
              {errMsg ?? "Something went wrong."}
            </p>
            <button
              className="text-[13px] text-[var(--color-sage-deep)] underline underline-offset-2"
              onClick={() => router.push("/voice")}
            >
              Go back and try again
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Intro carousel — auto-advancing, tap to navigate */}
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
              <div
                key={slideIdx}
                className="animate-fade-in-soft"
              >
                <p className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-sage-deep)] font-medium mb-1.5">
                  {slide.eyebrow}
                </p>
                <p className="display text-[19px] leading-snug mb-2">
                  {slide.title}
                </p>
                <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
                  {slide.body}
                </p>
              </div>
            </div>

            {/* Progress strip — fills while the current slide is showing */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-line)] overflow-hidden">
              <div
                key={`bar-${slideIdx}-${paused}`}
                className={
                  "h-full bg-[var(--color-sage)] origin-left " +
                  (paused ? "" : "animate-slide-fill")
                }
              />
            </div>
          </Card>

          {/* Carousel dot navigation */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {SLIDES.map((_, i) => (
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

          {/* Transcript preview slides in once we have one */}
          {transcriptPreview && (
            <Card
              className={
                "mb-5 transition-all duration-500 " +
                (stage >= 2
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none")
              }
            >
              <div className="flex items-start gap-3">
                <span className="grid place-items-center h-8 w-8 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] shrink-0">
                  <Quote size={14} />
                </span>
                <div>
                  <p className="text-[11.5px] uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    What Homi heard
                  </p>
                  <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed italic">
                    &ldquo;{transcriptPreview}
                    {state.transcript &&
                    state.transcript.length > transcriptPreview.length
                      ? "…"
                      : ""}
                    &rdquo;
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Cloud / on-device honesty card */}
          <Card className="flex items-start gap-3 mb-7">
            <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sky-soft)] text-[#3b5a73] shrink-0">
              {isLive ? <Cloud size={16} /> : <Cpu size={16} />}
            </span>
            <div className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
              {isLive ? (
                <>
                  Demo build · audio is routed to ElevenLabs Scribe and themes
                  are analyzed by Ollama. A production HOMING runs both
                  on-device.
                </>
              ) : (
                <>
                  The model ran locally. No audio or transcript was sent to a
                  server. You decide what HOMING keeps next.
                </>
              )}
            </div>
          </Card>
        </>
      )}

      <PrimaryButton
        onClick={() => router.push("/themes")}
        disabled={!isReady}
      >
        Review themes
      </PrimaryButton>
    </AppShell>
  );
}
