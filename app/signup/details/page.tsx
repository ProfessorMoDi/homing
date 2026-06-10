"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ChipToggle, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { useAppMode } from "@/lib/useAppMode";
import {
  PipelineStrip,
  ProgressiveResults,
} from "@/components/OnboardingProgress";

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
  ["friday-morning", "Friday morning until 15:00"],
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

type FieldKey = "gender" | "postcode" | "availability" | "commitment";

interface Signup {
  gender: string;
  postcode: string;
  availability: string[];
  commitment: string;
}

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
  return ["gender", "postcode", "availability", "commitment"];
}

function isDone(key: FieldKey, s: Signup): boolean {
  switch (key) {
    case "gender":
      return !!s.gender;
    case "postcode":
      // Accept any country's postcode — not everyone is Dutch.
      return s.postcode.trim().length >= 3;
    case "availability":
      return s.availability.length > 0;
    case "commitment":
      return !!s.commitment;
  }
}

export default function SignUpDetailsPage() {
  return (
    <Suspense
      fallback={
        <AppShell back="/voice" title="Quick profile">
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
    commitSignup,
    flushGraphMirror,
    refreshSimilarPeople,
    fillSignupRandom,
    hydrated,
    pipelineStage,
    pipelineError,
    retryPipeline,
    similarPeople,
  } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromVoice = searchParams.get("fromVoice") === "1";
  const s = state.signup;

  const [steps, setSteps] = useState<FieldKey[] | null>(null);

  // Snapshot unanswered questions once after hydration. Recomputing on every
  // keystroke removed a field from the list as soon as isDone flipped true,
  // which made idx jump to the next question before the user tapped Continue.
  useEffect(() => {
    if (!hydrated || steps !== null) return;
    setSteps(
      profileQuestionOrder(state.missingFields).filter(
        (k) => !isDone(k, state.signup),
      ),
    );
  }, [hydrated, state.signup, state.missingFields, steps]);
  const [idx, setIdx] = useState(0);
  const [attempted, setAttempted] = useState(false);

  const total = steps?.length ?? 0;
  const current = steps?.[idx];

  // What the voice pass already filled in — shown as reassurance on the first
  // screen so the form feels like a confirmation, not an interrogation.
  // Recomputed once hydration lands so it reflects the real pre-filled values.
  const heard = useMemo(() => {
    const items: string[] = [];
    const topicTitles = state.topics
      .filter((t) => !t.hidden)
      .map((t) => t.title);
    if (topicTitles.length > 0) {
      const shown =
        topicTitles.length > 6
          ? `${topicTitles.slice(0, 6).join(", ")} +${topicTitles.length - 6} more`
          : topicTitles.join(", ");
      items.push(`Interests · ${shown}`);
    }
    if (s.availability.length)
      items.push(
        `Availability · ${s.availability.map((a) => LABELS[a] ?? a).join(", ")}`,
      );
    if (s.commitment) items.push(`Rhythm · ${LABELS[s.commitment] ?? s.commitment}`);
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, state.topics, state.missingFields]);

  const toggleArr = (arr: string[], key: string) =>
    arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key];

  const mode = useAppMode();
  const nextAfterProfile = "/suggestions";
  const finishLabel = "See your activities";

  async function finish() {
    await flushGraphMirror({ profileCompleted: true });
    void refreshSimilarPeople();
    router.push(nextAfterProfile);
  }

  function goNext() {
    setAttempted(false);
    if (idx < total - 1) setIdx((i) => i + 1);
    else finish();
  }

  function goPrev() {
    setAttempted(false);
    if (idx > 0) setIdx((i) => i - 1);
    else router.push(fromVoice ? "/voice" : "/themes");
  }

  function onSingle(key: FieldKey, value: string) {
    setSignup({ [key]: value });
  }

  function currentValid(): boolean {
    if (!current) return true;
    return isDone(current, s);
  }

  function onContinue() {
    if (!currentValid()) {
      setAttempted(true);
      return;
    }
    goNext();
  }

  async function useSampleDetails() {
    fillSignupRandom();
    await flushGraphMirror({ profileCompleted: true });
    void refreshSimilarPeople();
    router.push(nextAfterProfile);
  }

  const profileBack = fromVoice ? "/voice" : "/themes";

  // Wait for the one-shot snapshot (taken after hydration) before deciding
  // which questions to show.
  if (steps === null) {
    return (
      <AppShell back={profileBack} title="Quick profile">
        <div className="flex items-center justify-center min-h-[40dvh] text-[13px] text-[var(--color-muted)]">
          Loading your profile…
        </div>
      </AppShell>
    );
  }

  // Everything already known (typical for the sample-recording demo path).
  if (total === 0) {
    const showPipeline =
      fromVoice || pipelineStage !== "idle" || !!state.transcript.trim();

    return (
      <AppShell back={profileBack} title="Your profile">
        {showPipeline && (
          <PipelineStrip stage={pipelineStage} showActivities />
        )}
        <div className="flex flex-col items-center text-center pt-6">
          <span className="grid place-items-center h-14 w-14 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] mb-4 animate-pop-check">
            <Check size={26} strokeWidth={2.5} />
          </span>
          <h1 className="display text-[23px] mb-1.5">You&apos;re all set</h1>
          <p className="text-[14px] text-[var(--color-ink-soft)] leading-relaxed max-w-[19rem]">
            Homi picked up everything it needed from your voice — nothing else
            to fill in.
          </p>
        </div>

        <div className="card-outline p-4 mt-6 mb-7 grid gap-2.5">
          {heard.map((line) => {
            const [head, rest] = line.split(" · ");
            return (
              <div key={head} className="flex items-start gap-2.5">
                <Check
                  size={15}
                  strokeWidth={2.5}
                  className="text-[var(--color-sage-deep)] mt-0.5 shrink-0"
                />
                <p className="text-[13.5px] text-[var(--color-ink-soft)]">
                  <span className="text-[var(--color-muted)]">{head}: </span>
                  {rest}
                </p>
              </div>
            );
          })}
          {heard.length === 0 && (
            <p className="text-[13.5px] text-[var(--color-ink-soft)]">
              Your profile is complete.
            </p>
          )}
        </div>

        <PrimaryButton onClick={finish}>
          <span className="inline-flex items-center justify-center gap-1.5">
            {finishLabel}
            <ArrowRight size={16} />
          </span>
        </PrimaryButton>

        {showPipeline && (
          <ProgressiveResults
            pipelineStage={pipelineStage}
            pipelineError={pipelineError}
            topics={state.topics}
            suggestedActivities={state.suggestedActivities}
            similarPeople={similarPeople}
            showActivities
            compact
          />
        )}
      </AppShell>
    );
  }

  const showPipeline =
    fromVoice || pipelineStage !== "idle" || !!state.transcript.trim();

  if (!current) return null;
  const q = QUESTIONS[current];

  return (
    <AppShell back={fromVoice ? "/voice" : "/themes"} title="Quick profile">
      {showPipeline && (
        <>
          <PipelineStrip stage={pipelineStage} showActivities />
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

      {/* Progress: in-flow back + segmented dots + counter */}
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

      {/* Voice-extracted reassurance, only on the first question */}
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
              const selected = (s[q.key] as string) === k;
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
          <>
            <div className="seg">
              {q.options!.map(([k, v]) => (
                <ChipToggle
                  key={k}
                  label={v}
                  selected={(s[q.key] as string[]).includes(k)}
                  onToggle={() => {
                    const next = toggleArr(s[q.key] as string[], k);
                    setSignup({ [q.key]: next });
                  }}
                />
              ))}
            </div>
          </>
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
            {idx === total - 1 ? finishLabel : "Continue"}
            <ArrowRight size={16} />
          </span>
        </PrimaryButton>
      </div>

      {showPipeline && (
        <ProgressiveResults
          pipelineStage={pipelineStage}
          pipelineError={pipelineError}
          topics={state.topics}
          suggestedActivities={state.suggestedActivities}
          similarPeople={similarPeople}
          showActivities
          compact
        />
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
