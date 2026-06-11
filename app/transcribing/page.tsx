"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Cloud,
  Cpu,
  Check,
  Quote,
  AlertCircle,
} from "lucide-react";
import { HomiWaitingCarousel } from "@/components/HomiWaitingCarousel";
import { AppShell } from "@/components/AppShell";
import { Card, PrimaryButton } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import { BreathingOrb } from "@/components/Loading";
import { useApp } from "@/lib/store";
import { takeAudio } from "@/lib/audioStash";
import { setCached, topicSignature } from "@/lib/suggestionsCache";

type Stage = 0 | 1 | 2 | 3 | 4; // idle / transcribing / analyzing / ready / error

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

function TranscribingFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-5">
      <div className="text-center">
        <div className="inline-block animate-float mb-3">
          <Pigeon size={64} />
        </div>
        <p className="text-[13.5px] text-[var(--color-muted)]">
          Homi is getting ready…
        </p>
      </div>
    </div>
  );
}

export default function TranscribingPage() {
  return (
    <Suspense fallback={<TranscribingFallback />}>
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
    setDetectedLanguage,
    startVoicePipeline,
    pipelineStage,
    pipelineError,
    retryPipeline,
  } = useApp();

  const [stage, setStage] = useState<Stage>(0);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const startedRef = useRef(false);
  const fakeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Warm /themes so the auto-advance (and the "Review themes" tap) land
  // instantly instead of paying a cold route load at the end of the pipeline.
  useEffect(() => {
    router.prefetch("/themes");
  }, [router]);

  // Clear any pending fake-progression timers on unmount (every entry branch
  // schedules them, but only one set a cleanup before).
  useEffect(() => () => fakeTimersRef.current.forEach(clearTimeout), []);

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
        // Happy path now runs the pipeline from /voice → /signup/details.
        // This screen is a fallback when audio is gone or you deep-link here.
        if (state.transcript || state.topics.length > 0 || pipelineStage !== "idle") {
          setStage(2);
        } else {
          setErrMsg(
            "We lost your recording — that can happen if you refresh the page. Please go back and record again.",
          );
          setStage(4);
        }
        return;
      }
      startVoicePipeline(audio.blob);
      router.replace("/signup/details?fromVoice=1");
      return;
    }

    // Direct navigation without ?live= or ?sample= — don't invent a profile.
    if (state.transcript || state.topics.length > 0) {
      runFakeProgression();
    } else {
      setErrMsg("Start from the voice screen to record.");
      setStage(4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { fakeTimersRef.current.forEach(clearTimeout); };
  }, []);

  function runFakeProgression() {
    setStage(1);
    fakeTimersRef.current = [
      setTimeout(() => setStage(2), 1100),
      setTimeout(() => setStage(3), 2300),
    ];
  }

  async function runRealPipeline(blob: Blob, _demoMode: boolean) {
    setStage(1);
    let transcript = "";
    let detectedLang: string | null = null;
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const r = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!r.ok) throw new Error(`transcribe ${r.status}`);
      const data = (await r.json()) as { text?: string; language?: string | null };
      transcript = (data.text || "").trim();
      detectedLang =
        typeof data.language === "string" && data.language.trim()
          ? data.language.trim()
          : null;
      if (detectedLang) setDetectedLanguage(detectedLang);
      if (!transcript) throw new Error("empty transcript");
    } catch (e) {
      console.error("Transcribe failed", e);
      setErrMsg(
        "We couldn't reach the transcription service. Please go back and try recording again.",
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
        body: JSON.stringify({
          transcript,
          detected_language: detectedLang,
        }),
      });
      if (r.ok) {
        const analysis = (await r.json()) as Parameters<
          typeof setLiveProfile
        >[1] & {
          topics: { title: string; explanation: string; tags: string[] }[];
        };
        if (analysis.topics?.length > 0) {
          let activities = analysis.activities ?? [];
          if (activities.length === 0) {
            try {
              const sr = await fetch("/api/suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  transcript,
                  topics: analysis.topics,
                  languages: analysis.languages,
                  availability_hints: analysis.availability,
                  minor_interests: analysis.minor_interests,
                }),
              });
              if (sr.ok) {
                const sd = (await sr.json()) as {
                  activities?: typeof activities;
                };
                activities = sd.activities ?? [];
              }
            } catch (e) {
              console.warn("Suggest fallback after empty plan pass failed", e);
            }
          }
          setLiveProfile(transcript, {
            topics: analysis.topics,
            minor_interests: analysis.minor_interests ?? [],
            languages: analysis.languages ?? [],
            language_confidence: analysis.language_confidence,
            activity_types: analysis.activity_types ?? [],
            availability: analysis.availability ?? [],
            commitment: analysis.commitment ?? "",
            implicit_preferences: analysis.implicit_preferences,
            companion_reflection: analysis.companion_reflection,
            matching_notes: analysis.matching_notes,
            missing_fields: analysis.missing_fields,
            detected_language: detectedLang,
            activities,
          });
          if (activities.length > 0) {
            const sig = topicSignature(
              analysis.topics.map((t) => ({ title: t.title, tags: t.tags })),
            );
            setCached(sig, activities);
          }
        }
      } else {
        console.warn("Analyze failed, keeping keyword fallback", r.status);
      }
    } catch (e) {
      console.warn("Analyze threw, keeping keyword fallback", e);
    }

    setStage(3);
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

  const isError = stage === 4;
  const isReady =
    stage === 3 ||
    state.topics.length > 0 ||
    pipelineStage === "ready" ||
    pipelineStage === "people";

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
          <HomiWaitingCarousel pausedExternally={isError} />

          {state.companionReflection && stage >= 3 && (
            <Card className="mb-5 animate-pop-in">
              <p className="text-[11.5px] uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
                Homi&apos;s take
              </p>
              <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
                {state.companionReflection}
              </p>
              {state.topics.length > 0 && (
                <p className="text-[12px] text-[var(--color-sage-deep)] mt-2">
                  {state.topics.length} interest
                  {state.topics.length === 1 ? "" : "s"} picked up
                  {state.suggestedActivities.length > 0 &&
                    ` · ${state.suggestedActivities.length} activity ideas`}
                </p>
              )}
            </Card>
          )}

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
                  Homi listens once, catches what you&apos;re into, and lets the
                  recording go. Only the interests you confirm stick around.
                </>
              ) : isSample ? (
                <>
                  Sample profile — pre-loaded interests for the demo. Live
                  recordings use cloud transcription, then only text is kept.
                </>
              ) : (
                <>
                  Demo path — interests are pre-loaded. On a live recording,
                  audio is transcribed once and discarded after.
                </>
              )}
            </div>
          </Card>
        </>
      )}

      {pipelineError && (
        <div className="card-outline p-3 mb-4 border-[var(--color-clay)] text-[12.5px] text-[var(--color-ink-soft)] flex items-center justify-between gap-3">
          <span>{pipelineError}</span>
          <button
            type="button"
            onClick={retryPipeline}
            className="text-[12px] font-medium text-[var(--color-sage-deep)] shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <PrimaryButton
        onClick={() => router.push("/signup/details?fromVoice=1")}
        disabled={!isReady && pipelineStage === "idle" && !state.transcript}
      >
        {state.topics.length > 0 ? "Continue to profile" : "Check progress"}
      </PrimaryButton>
      {isReady && (
        <button
          type="button"
          className="btn-secondary w-full mt-2"
          onClick={() => router.push("/themes")}
        >
          Review themes
        </button>
      )}
    </AppShell>
  );
}
