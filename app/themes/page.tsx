"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Pencil, X, RotateCcw, Sparkles, Check, ChevronDown, ChevronUp, Quote, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, PrimaryButton, SecondaryButton, Pill } from "@/components/Bits";
import { ThinkingDots } from "@/components/Loading";
import { useApp } from "@/lib/store";
import { useAppMode } from "@/lib/useAppMode";
import { pipelineStageLabel } from "@/lib/voicePipeline";
import {
  clearCached,
  getCached,
  getOrFetchSuggestions,
  topicSignature,
  type RawSuggestedActivity,
} from "@/lib/suggestionsCache";

type RegenStatus = "idle" | "loading" | "ready" | "error";

export default function Themes() {
  const {
    state,
    updateTopic,
    removeTopic,
    loadSampleVoice,
    setSuggestedActivities,
    pipelineStage,
    pipelineError,
    retryPipeline,
    flushGraphMirror,
    refreshSimilarPeople,
  } = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [regen, setRegen] = useState<RegenStatus>("idle");
  const [retryTick, setRetryTick] = useState(0);

  const mode = useAppMode();
  const showDemoSample = mode === "demo";

  const canContinue = state.topics.length > 0;

  const profileBack =
    state.transcript.trim() || pipelineStage !== "idle"
      ? "/signup/details?fromVoice=1"
      : "/signup/details";

  // Warm the next two routes so the transition is instant once they tap.
  useEffect(() => {
    router.prefetch("/signup/details");
    router.prefetch("/suggestions");
  }, [router]);

  // Background regeneration of activity suggestions, keyed on a topic
  // signature. The module-level cache survives navigation and React Strict
  // Mode's double mount, so going back and forth never re-fires the request.
  // We deliberately subscribe a fresh .then on every mount — the cache
  // module's inflight dedup keeps the network call to one even though the
  // effect runs twice under Strict Mode.
  useEffect(() => {
    // Pipeline already fetches suggestions in the background.
    if (
      state.suggestedActivities.length > 0 ||
      pipelineStage === "transcribing" ||
      pipelineStage === "understanding" ||
      pipelineStage === "planning"
    ) {
      if (state.suggestedActivities.length > 0) setRegen("ready");
      return;
    }

    const visibleTopics = state.topics
      .filter((t) => !t.hidden)
      .map((t) => ({
        title: t.title,
        explanation: t.explanation,
        tags: t.tags,
      }));

    if (visibleTopics.length === 0) return;

    const sig = topicSignature(visibleTopics);

    // Cache hit — apply synchronously. Survives Strict Mode and back-nav.
    const cached = getCached(sig);
    if (cached) {
      setSuggestedActivities(cached);
      setRegen("ready");
      return;
    }

    let cancelled = false;
    setRegen("loading");

    // Hard safety net — if Ollama/Vercel hang, drop to error after 25s so
    // the user can retry instead of staring at a spinner.
    const safety = setTimeout(() => {
      if (!cancelled) setRegen("error");
    }, 25000);

    getOrFetchSuggestions(sig, async () => {
      const r = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: visibleTopics,
          transcript: state.transcript,
          availability_hints: state.signup.availability,
          minor_interests: state.minorInterests,
          limit: 12,
        }),
      });
      if (!r.ok) throw new Error(`Suggest failed (${r.status})`);
      const data = (await r.json()) as { activities?: RawSuggestedActivity[] };
      const list = Array.isArray(data.activities) ? data.activities : [];
      if (list.length === 0) {
        throw new Error("Empty activities");
      }
      return list;
    })
      .then((activities) => {
        if (cancelled) return;
        clearTimeout(safety);
        setSuggestedActivities(activities);
        setRegen("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        clearTimeout(safety);
        console.warn("Background suggest failed", err);
        setRegen("error");
      });

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, [
    state.topics,
    state.signup.availability,
    state.minorInterests,
    state.transcript,
    setSuggestedActivities,
    retryTick,
    pipelineStage,
    state.suggestedActivities.length,
  ]);

  const onRetry = useCallback(() => {
    const visibleTopics = state.topics
      .filter((t) => !t.hidden)
      .map((t) => ({
        title: t.title,
        explanation: t.explanation,
        tags: t.tags,
      }));
    if (visibleTopics.length === 0) return;
    clearCached(topicSignature(visibleTopics));
    setRegen("loading");
    setRetryTick((n) => n + 1);
  }, [state.topics]);

  const pipelineBusy =
    pipelineStage === "transcribing" || pipelineStage === "understanding";

  if (state.topics.length === 0) {
    const hasTranscript = !!state.transcript.trim();
    const showSample = showDemoSample;
    if (pipelineBusy || (hasTranscript && !pipelineError)) {
      return (
        <AppShell back={profileBack} title="Main themes">
          <h1 className="display text-[26px] mb-1">Main themes Homi heard</h1>
          <p className="text-[13.5px] text-[var(--color-muted)] mb-5">
            {pipelineStageLabel(pipelineStage)}
          </p>
          <div className="grid gap-3 mb-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="card animate-pulse h-24 bg-[var(--color-cream-warm)]"
              />
            ))}
          </div>
        </AppShell>
      );
    }
    return (
      <AppShell back={profileBack} title="Main themes">
        <div className="card p-6 text-center">
          <p className="text-[14px] text-[var(--color-ink-soft)] mb-4 leading-relaxed">
            {pipelineError
              ? pipelineError
              : hasTranscript
                ? "Homi couldn't pull themes from your recording. Try recording again — 30 seconds with several interests helps."
                : "Nothing to review yet. Record your voice first."}
          </p>
          <div className="grid gap-2">
            {pipelineError && (
              <SecondaryButton onClick={retryPipeline}>Retry Homi</SecondaryButton>
            )}
            <SecondaryButton onClick={() => router.push("/voice")}>
              Record again
            </SecondaryButton>
            {showSample && (
              <SecondaryButton onClick={loadSampleVoice}>
                Load sample
              </SecondaryButton>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back={profileBack} title="Main themes">
      <h1 className="display text-[26px] mb-1">Main themes Homi heard</h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-2">
        Everything you mentioned — edit, remove, or hide anything that doesn&apos;t
        fit. Star the ones that really matter to you; they count extra when
        Homi matches people.
      </p>
      {state.topics.length > 0 && (
        <p className="text-[12px] text-[var(--color-sage-deep)] mb-3">
          {state.topics.length} interest{state.topics.length === 1 ? "" : "s"}
          {state.suggestedActivities.length > 0 &&
            ` → ${state.suggestedActivities.length} activity ideas`}
        </p>
      )}
      {state.transcript.trim() && (
        <TranscriptCollapsible transcript={state.transcript} />
      )}
      {state.companionReflection && (
        <div className="card-outline p-3.5 mb-4 text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
          {state.companionReflection}
        </div>
      )}
      {pipelineError && (
        <div className="card-outline p-3 mb-4 flex items-start justify-between gap-3 border-[var(--color-clay)]">
          <p className="text-[12.5px] text-[var(--color-ink-soft)]">{pipelineError}</p>
          <button
            type="button"
            onClick={retryPipeline}
            className="text-[12px] font-medium text-[var(--color-sage-deep)] shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <div className="card-outline p-3 mb-4 text-[12.5px] text-[var(--color-ink-soft)]">
        {state.suggestedActivities.length > 0 ? (
          <>
            <span className="text-[var(--color-sage-deep)] font-medium">
              {state.suggestedActivities.length} activity ideas ready
            </span>
            {" — review interests below, then see suggestions."}
          </>
        ) : pipelineStage === "planning" || pipelineStage === "syncing" ? (
          <>
            <ThinkingDots size="small" /> Homi is drafting activity ideas from
            your {state.topics.length} interests…
          </>
        ) : (
          "Activities will appear on the next screen once Homi finishes drafting."
        )}
      </div>

      <div className="grid gap-3 mb-5 stagger">
        {state.topics.map((t) => (
          <Card key={t.id} className="relative">
            {editing === t.id ? (
              <div className="grid gap-3">
                <input
                  className="field"
                  value={t.title}
                  onChange={(e) =>
                    updateTopic(t.id, { title: e.target.value })
                  }
                />
                <textarea
                  className="field min-h-20"
                  value={t.explanation}
                  onChange={(e) =>
                    updateTopic(t.id, { explanation: e.target.value })
                  }
                />
                <div className="flex gap-2">
                  <button
                    className="btn-ghost"
                    onClick={() => setEditing(null)}
                  >
                    Done
                  </button>
                  <button
                    className="btn-ghost text-[var(--color-clay)]"
                    onClick={() => {
                      removeTopic(t.id);
                      setEditing(null);
                    }}
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="display text-[18px] mb-1">
                      {t.title}
                      {t.core && (
                        <span className="ml-2 align-middle inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
                          <Star size={9} fill="currentColor" /> core
                        </span>
                      )}
                    </p>
                    <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
                      {t.explanation}
                    </p>
                    {t.quote && (
                      <p className="text-[12px] text-[var(--color-muted)] mt-1 italic">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      aria-label={t.core ? "Unstar" : "Star as core interest"}
                      aria-pressed={!!t.core}
                      className={
                        "btn-ghost transition-colors " +
                        (t.core
                          ? "!text-[var(--color-sage-deep)]"
                          : "text-[var(--color-muted)]")
                      }
                      onClick={() => updateTopic(t.id, { core: !t.core })}
                    >
                      <Star
                        size={15}
                        fill={t.core ? "currentColor" : "none"}
                        className={t.core ? "animate-pop-check" : undefined}
                      />
                    </button>
                    <button
                      aria-label="Edit"
                      className="btn-ghost"
                      onClick={() => setEditing(t.id)}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {t.tags.slice(0, 3).map((tag) => (
                    <Pill key={tag}>{tag}</Pill>
                  ))}
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      <Link href="/themes/full" className="block">
        <SecondaryButton>Show more</SecondaryButton>
      </Link>

      <div className="divider" />

      <RegenBadge status={regen} onRetry={onRetry} />

      <PrimaryButton
        onClick={() => {
          void flushGraphMirror();
          void refreshSimilarPeople();
          router.push("/suggestions");
        }}
        disabled={!canContinue}
      >
        {canContinue ? "Looks right" : "Waiting for interests…"}
      </PrimaryButton>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          className="btn-secondary"
          onClick={() => router.push("/voice")}
        >
          <RotateCcw size={14} /> Record again
        </button>
        <Link href="/themes/full">
          <SecondaryButton>Edit details</SecondaryButton>
        </Link>
      </div>
    </AppShell>
  );
}

function TranscriptCollapsible({ transcript }: { transcript: string }) {
  const [open, setOpen] = useState(false);
  const preview = transcript.trim().split(/\s+/).slice(0, 28).join(" ");
  const truncated = transcript.trim().length > preview.length + 4;

  return (
    <Card className="mb-4 !p-0 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-start gap-3 p-3.5 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="grid place-items-center h-8 w-8 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] shrink-0">
          <Quote size={14} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11.5px] uppercase tracking-wider text-[var(--color-muted)] mb-1">
            What you said
          </p>
          <p
            className={
              "text-[13px] text-[var(--color-ink-soft)] leading-relaxed " +
              (open ? "whitespace-pre-line" : "line-clamp-2 italic")
            }
          >
            {open ? transcript.trim() : `“${preview}${truncated ? "…" : ""}”`}
          </p>
        </div>
        <span className="text-[var(--color-muted)] shrink-0 mt-1">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
    </Card>
  );
}

function RegenBadge({
  status,
  onRetry,
}: {
  status: RegenStatus;
  onRetry: () => void;
}) {
  if (status === "idle") return null;
  return (
    <div className="mb-3 flex items-center justify-center gap-2">
      <span
        key={status}
        className={
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] transition-colors animate-pop-in " +
          (status === "loading"
            ? "bg-[var(--color-cream-warm)] text-[var(--color-ink-soft)]"
            : status === "ready"
              ? "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]"
              : "bg-[var(--color-clay-soft)] text-[#7d4730]")
        }
      >
        {status === "loading" && (
          <>
            <Sparkles size={12} className="animate-pulse" />
            Homi is drafting things you could actually do
            <ThinkingDots size="small" />
          </>
        )}
        {status === "ready" && (
          <>
            <Check size={12} strokeWidth={3} className="animate-pop-check" />
            Homi has fresh suggestions ready
          </>
        )}
        {status === "error" && (
          <>
            <Sparkles size={12} />
            Homi couldn&apos;t finish — using earlier ideas
          </>
        )}
      </span>
      {status === "error" && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] text-[var(--color-sage-deep)] hover:bg-[var(--color-sage-soft)] transition-colors tap"
        >
          <RotateCcw size={11} />
          Retry
        </button>
      )}
    </div>
  );
}
