"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Quote, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, ChipToggle, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { HomiWaitingCarousel } from "@/components/HomiWaitingCarousel";
import { ThinkingDots } from "@/components/Loading";
import { useApp } from "@/lib/store";
import { useAppMode } from "@/lib/useAppMode";
import { pipelineStageLabel } from "@/lib/voicePipeline";
import { PipelineStrip } from "@/components/OnboardingProgress";

const GENDER = [
  ["male", "Male"],
  ["female", "Female"],
  ["non-binary", "Non-binary"],
  ["prefer-not-to-say", "Prefer not to say"],
] as const;

const AVAIL = [
  ["every-weekend", "Every weekend"],
  ["weekday-evenings", "Weekday evenings"],
  ["thursday-evening", "Thursday evening"],
  ["weekday-daytime", "Weekday daytime"],
  ["flexible", "Flexible"],
] as const;

const COMMIT = [
  ["try-once", "Try it once"],
  ["maybe-weekly", "Maybe weekly"],
  ["regular-thing", "Looking for a regular thing"],
  ["open-ended", "Open-ended"],
] as const;

const LABELS: Record<string, string> = Object.fromEntries([
  ...AVAIL,
  ...COMMIT,
]);

type FieldKey =
  | "gender"
  | "postcode"
  | "shareName"
  | "availability"
  | "commitment";

// Keys backed by the signup object (everything except shareName, which is
// stored top-level as shareNameWithSimilar).
type SignupFieldKey = Exclude<FieldKey, "shareName">;

interface Signup {
  gender: string;
  postcode: string;
  availability: string[];
  commitment: string;
}

const SHARE_NAME = [
  ["yes", "Yes, show my first name"],
  ["no", "Keep me anonymous for now"],
] as const;

interface Question {
  key: FieldKey;
  kind: "single" | "multi" | "postcode";
  eyebrow: string;
  title: string;
  subtitle?: string;
  options?: readonly (readonly [string, string])[];
}

const QUESTIONS: Record<FieldKey, Question> = {
  gender: {
    key: "gender",
    kind: "single",
    eyebrow: "About you",
    title: "How do you identify?",
    subtitle: "Optional — stored on your profile, not used in matching.",
    options: GENDER,
  },
  postcode: {
    key: "postcode",
    kind: "postcode",
    eyebrow: "Where you are",
    title: "What's your postcode?",
    subtitle: "We use it to lean toward activities near you. Any country is fine.",
  },
  shareName: {
    key: "shareName",
    kind: "single",
    eyebrow: "Finding your people",
    title: "Show your first name to people similar to you?",
    subtitle:
      "When Homi finds someone who shares your interests, we can show them your first name — and show you theirs. (Your group always sees your name once you meet.)",
    options: SHARE_NAME,
  },
  availability: {
    key: "availability",
    kind: "multi",
    eyebrow: "Your week",
    title: "When are you usually around?",
    subtitle: "Pick all that apply.",
    options: AVAIL,
  },
  commitment: {
    key: "commitment",
    kind: "single",
    eyebrow: "Rhythm",
    title: "How often would you like to meet?",
    options: COMMIT,
  },
};

function profileQuestionOrder(_missingFields: string[]): FieldKey[] {
  return ["gender", "postcode", "shareName", "availability", "commitment"];
}

function snapshotSteps(
  fromVoice: boolean,
  signup: Signup,
  missingFields: string[],
  shareNameWithSimilar: boolean | null,
): FieldKey[] {
  const order = profileQuestionOrder(missingFields);
  if (fromVoice) {
    return order.filter(
      (k) =>
        k === "gender" ||
        k === "postcode" ||
        k === "shareName" ||
        !isDone(k, signup, shareNameWithSimilar),
    );
  }
  return order.filter((k) => !isDone(k, signup, shareNameWithSimilar));
}

function isDone(
  key: FieldKey,
  s: Signup,
  shareNameWithSimilar: boolean | null,
): boolean {
  switch (key) {
    case "gender":
      return !!s.gender;
    case "postcode":
      return s.postcode.trim().length >= 3;
    case "shareName":
      return shareNameWithSimilar !== null;
    case "availability":
      return s.availability.length > 0;
    case "commitment":
      return !!s.commitment;
  }
}

function TranscriptSnippet({ transcript }: { transcript: string }) {
  const preview = transcript
    .trim()
    .split(/\s+/)
    .slice(0, 22)
    .join(" ");
  if (!preview) return null;

  return (
    <Card className="mb-5 animate-fade-in-soft">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center h-8 w-8 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] shrink-0">
          <Quote size={14} />
        </span>
        <div>
          <p className="text-[11.5px] uppercase tracking-wider text-[var(--color-muted)] mb-1">
            What Homi heard
          </p>
          <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed italic">
            &ldquo;{preview}
            {transcript.length > preview.length ? "…" : ""}&rdquo;
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function SignUpDetailsPage() {
  return (
    <Suspense
      fallback={
        <AppShell back="/voice" title="Homi is listening">
          <div className="flex items-center justify-center min-h-[40dvh] text-[13px] text-[var(--color-muted)]">
            Loading…
          </div>
        </AppShell>
      }
    >
      <SignUpDetails />
    </Suspense>
  );
}

function SignUpDetails() {
  const {
    state,
    setSignup,
    setShareNameWithSimilar,
    flushGraphMirror,
    fillSignupRandom,
    hydrated,
    pipelineStage,
    pipelineError,
    retryPipeline,
  } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromVoice = searchParams.get("fromVoice") === "1";
  const s = state.signup;
  const profileSessionId = state.profileSessionId;
  const autoAdvancedRef = useRef(false);

  const [steps, setSteps] = useState<FieldKey[] | null>(null);
  const [snapshottedFor, setSnapshottedFor] = useState<number | null>(null);
  const [idx, setIdx] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [questionsComplete, setQuestionsComplete] = useState(false);

  const profileBack = fromVoice ? "/voice" : "/themes";
  const pageTitle = fromVoice ? "Homi is listening" : "Quick profile";

  useEffect(() => {
    if (fromVoice) router.prefetch("/themes");
  }, [fromVoice, router]);

  useEffect(() => {
    autoAdvancedRef.current = false;
    setQuestionsComplete(false);
    setIdx(0);
    setAttempted(false);
  }, [profileSessionId]);

  useEffect(() => {
    if (!hydrated) return;
    if (snapshottedFor === profileSessionId && steps !== null) return;
    const snap = snapshotSteps(
      fromVoice,
      state.signup,
      state.missingFields,
      state.shareNameWithSimilar,
    );
    setSnapshottedFor(profileSessionId);
    setSteps(snap);
    setIdx(0);
    if (snap.length === 0) setQuestionsComplete(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, profileSessionId, fromVoice]);

  const total = steps?.length ?? 0;
  const current = steps?.[idx];

  const heard = useMemo(() => {
    const items: string[] = [];
    if (s.availability.length)
      items.push(
        `Availability · ${s.availability.map((a) => LABELS[a] ?? a).join(", ")}`,
      );
    if (s.commitment) items.push(`Rhythm · ${LABELS[s.commitment] ?? s.commitment}`);
    return items;
  }, [s.availability, s.commitment]);

  const showPipeline =
    fromVoice || pipelineStage !== "idle" || !!state.transcript.trim();

  const pipelineWorking =
    pipelineStage !== "idle" &&
    pipelineStage !== "ready" &&
    pipelineStage !== "error";

  const topicsReady = state.topics.length > 0;
  const waitingOnTopics =
    questionsComplete && !topicsReady && pipelineStage !== "error";

  useEffect(() => {
    if (!questionsComplete || !topicsReady || autoAdvancedRef.current) return;
    autoAdvancedRef.current = true;
    void flushGraphMirror({ profileCompleted: true });
    const t = setTimeout(() => router.push("/themes"), 1200);
    return () => clearTimeout(t);
  }, [questionsComplete, topicsReady, flushGraphMirror, router]);

  const toggleArr = (arr: string[], key: string) =>
    arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key];

  const mode = useAppMode();

  function completeQuestions() {
    setQuestionsComplete(true);
    void flushGraphMirror({ profileCompleted: true });
  }

  function goNext() {
    setAttempted(false);
    if (idx < total - 1) setIdx((i) => i + 1);
    else completeQuestions();
  }

  function goPrev() {
    setAttempted(false);
    if (idx > 0) setIdx((i) => i - 1);
    else router.push(fromVoice ? "/voice" : "/themes");
  }

  function onSingle(key: FieldKey, value: string) {
    if (key === "shareName") {
      setShareNameWithSimilar(value === "yes");
      return;
    }
    setSignup({ [key]: value });
  }

  function currentValid(): boolean {
    if (!current) return true;
    return isDone(current, s, state.shareNameWithSimilar);
  }

  function onContinue() {
    if (!currentValid()) {
      setAttempted(true);
      return;
    }
    goNext();
  }

  function useSampleDetails() {
    fillSignupRandom();
    completeQuestions();
  }

  function renderWaitBody() {
    return (
      <>
        <div className="flex flex-col items-center text-center pt-4 mb-5">
          <h1 className="display text-[23px] mb-1.5">
            {topicsReady ? "Interests ready" : "Homi is working"}
          </h1>
          <p className="text-[14px] text-[var(--color-ink-soft)] leading-relaxed max-w-[20rem]">
            {topicsReady
              ? "Taking you to review what Homi heard…"
              : waitingOnTopics
                ? pipelineStageLabel(pipelineStage)
                : "A few pigeon facts while Homi reads your voice."}
          </p>
          {topicsReady && (
            <p className="text-[12px] text-[var(--color-sage-deep)] mt-2 inline-flex items-center gap-1">
              <ThinkingDots size="small" />
            </p>
          )}
        </div>

        {state.transcript.trim() && (
          <TranscriptSnippet transcript={state.transcript} />
        )}

        {(pipelineWorking || waitingOnTopics) && (
          <div className="mt-2">
            <HomiWaitingCarousel />
          </div>
        )}
      </>
    );
  }

  if (steps === null) {
    return (
      <AppShell back={profileBack} title={pageTitle}>
        <div className="flex items-center justify-center min-h-[40dvh] text-[13px] text-[var(--color-muted)]">
          Loading your profile…
        </div>
      </AppShell>
    );
  }

  if (questionsComplete) {
    return (
      <AppShell back={profileBack} title={pageTitle}>
        {showPipeline && (
          <>
            <PipelineStrip stage={pipelineStage} showActivities={false} />
            {pipelineError && (
              <div className="card-outline p-3 mb-4 flex items-start justify-between gap-3 border-[var(--color-clay)]">
                <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
                  {pipelineError}
                </p>
                <button
                  type="button"
                  onClick={retryPipeline}
                  className="text-[12px] font-medium text-[var(--color-sage-deep)] shrink-0"
                >
                  Retry
                </button>
              </div>
            )}
          </>
        )}
        {renderWaitBody()}
        <p className="text-[12px] text-[var(--color-muted)] text-center mt-6">
          You control what is used.
        </p>
      </AppShell>
    );
  }

  if (!current) return null;
  const q = QUESTIONS[current];

  return (
    <AppShell back={profileBack} title={pageTitle}>
      {showPipeline && (
        <>
          <PipelineStrip stage={pipelineStage} showActivities={false} />
          {pipelineError && (
            <div className="card-outline p-3 mb-4 flex items-start justify-between gap-3 border-[var(--color-clay)]">
              <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
                {pipelineError}
              </p>
              <button
                type="button"
                onClick={retryPipeline}
                className="text-[12px] font-medium text-[var(--color-sage-deep)] shrink-0"
              >
                Retry
              </button>
            </div>
          )}
        </>
      )}

      {state.transcript.trim() && (
        <TranscriptSnippet transcript={state.transcript} />
      )}

      <div className="flex items-center gap-3 mb-7">
        <button
          aria-label="Previous question"
          onClick={goPrev}
          className="btn-ghost px-2 -ml-2 shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 h-1 rounded-full bg-[var(--color-cream-warm)] overflow-hidden">
          <div
            className="h-full bg-[var(--color-sage)] transition-all duration-300"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
        <span className="text-[11.5px] text-[var(--color-muted)] tabular-nums shrink-0">
          {idx + 1} / {total}
        </span>
      </div>

      {idx === 0 && heard.length > 0 && (
        <div className="card-outline p-3.5 mb-6 flex items-start gap-2.5">
          <span className="grid place-items-center h-7 w-7 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] shrink-0">
            <Sparkles size={14} />
          </span>
          <div>
            <p className="text-[12.5px] font-medium text-[var(--color-ink)] mb-0.5">
              Homi already caught a few things from your voice
            </p>
            <p className="text-[12px] text-[var(--color-muted)] leading-relaxed">
              {heard.join("  ·  ")}. Just a couple more below.
            </p>
          </div>
        </div>
      )}

      <div key={q.key} className="animate-fade-in-soft">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-sage-deep)] font-medium mb-2">
          {q.eyebrow}
        </p>
        <h1 className="display text-[24px] leading-snug mb-1.5">{q.title}</h1>
        {q.subtitle && (
          <p className="text-[13.5px] text-[var(--color-muted)] mb-5">
            {q.subtitle}
          </p>
        )}
        {!q.subtitle && <div className="mb-5" />}

        {q.kind === "single" && (
          <div className="grid gap-2.5">
            {q.options!.map(([k, v]) => {
              const selected =
                q.key === "shareName"
                  ? (state.shareNameWithSimilar === true && k === "yes") ||
                    (state.shareNameWithSimilar === false && k === "no")
                  : (s[q.key as SignupFieldKey] as string) === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onSingle(q.key, k)}
                  className={
                    "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all " +
                    (selected
                      ? "border-[var(--color-sage)] bg-[var(--color-sage-soft)] text-[var(--color-ink)]"
                      : "border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:border-[var(--color-muted)] active:scale-[0.99]")
                  }
                >
                  <span className="text-[15px] font-medium">{v}</span>
                  <span
                    className={
                      "grid place-items-center h-5 w-5 rounded-full transition-colors " +
                      (selected
                        ? "bg-[var(--color-sage)] text-white"
                        : "border border-[var(--color-line)]")
                    }
                  >
                    {selected && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {q.kind === "multi" && (
          <div className="seg">
            {q.options!.map(([k, v]) => (
              <ChipToggle
                key={k}
                label={v}
                selected={(s[q.key as SignupFieldKey] as string[]).includes(k)}
                onToggle={() => {
                  const next = toggleArr(s[q.key as SignupFieldKey] as string[], k);
                  setSignup({ [q.key as SignupFieldKey]: next });
                }}
              />
            ))}
          </div>
        )}

        {q.kind === "postcode" && (
          <input
            className="field"
            placeholder="e.g. 3062 PA, 10115, SW1A 1AA"
            maxLength={12}
            autoFocus
            value={s.postcode}
            onChange={(e) => setSignup({ postcode: e.target.value.toUpperCase() })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onContinue();
            }}
          />
        )}

        {attempted && !currentValid() && (
          <p className="text-[12.5px] text-[var(--color-clay)] mt-3">
            {q.kind === "postcode"
              ? "Enter your postcode."
              : "Pick at least one to continue."}
          </p>
        )}
      </div>

      <div className="mt-7">
        <PrimaryButton onClick={onContinue}>
          <span className="inline-flex items-center justify-center gap-1.5">
            {idx === total - 1 ? "Continue" : "Continue"}
            <ArrowRight size={16} />
          </span>
        </PrimaryButton>
      </div>

      {showPipeline && pipelineWorking && (
        <div className="mt-6">
          <HomiWaitingCarousel />
        </div>
      )}

      {mode === "demo" && (
        <div className="mt-3">
          <SecondaryButton onClick={useSampleDetails}>
            <Sparkles size={15} />
            Fill the rest with sample details
          </SecondaryButton>
        </div>
      )}
      <p className="text-[12px] text-[var(--color-muted)] text-center mt-3">
        You control what is used.
      </p>
    </AppShell>
  );
}
