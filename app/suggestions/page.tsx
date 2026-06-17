"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Clock,
  MapPin,
  Users,
  ChevronRight,
  Mail,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Pill, GhostButton, SecondaryButton } from "@/components/Bits";
import { incomingInviteActivity } from "@/lib/matching";
import type { Activity } from "@/lib/types";
import { useApp } from "@/lib/store";
import { formatDayTime, formatDuration } from "@/lib/formatActivity";
import { useAppMode } from "@/lib/useAppMode";
import { pipelineStageLabel } from "@/lib/voicePipeline";
import { ThinkingDots } from "@/components/Loading";
import {
  clearCached,
  getCached,
  getOrFetchSuggestions,
  topicSignature,
  type RawSuggestedActivity,
} from "@/lib/suggestionsCache";

type RegenStatus = "idle" | "loading" | "ready" | "error";

export default function Suggestions() {
  const router = useRouter();
  const {
    state,
    setActivity,
    markActivityForSync,
    pipelineStage,
    similarPeople,
    setSuggestedActivities,
  } = useApp();
  const mode = useAppMode();
  const isDemo = mode === "demo";
  const isCollect = mode === "collect";
  const [regen, setRegen] = useState<RegenStatus>("idle");
  const [retryTick, setRetryTick] = useState(0);

  const topicOrder = useMemo(
    () =>
      new Map(
        state.topics
          .filter((t) => !t.hidden)
          .map((t, i) => [t.title.toLowerCase(), i]),
      ),
    [state.topics],
  );

  const cards = useMemo(() => {
    const list = [...(state.suggestedActivities ?? [])];
    list.sort((a, b) => {
      const ai =
        topicOrder.get(a.title.toLowerCase()) ??
        topicOrder.get((a.specific_interest_tags ?? [])[0]?.toLowerCase() ?? "") ??
        999;
      const bi =
        topicOrder.get(b.title.toLowerCase()) ??
        topicOrder.get((b.specific_interest_tags ?? [])[0]?.toLowerCase() ?? "") ??
        999;
      return ai - bi;
    });
    return list;
  }, [state.suggestedActivities, topicOrder]);

  const hasLiveTranscript = !!state.transcript.trim();
  const pipelineBusy =
    pipelineStage === "transcribing" ||
    pipelineStage === "understanding" ||
    pipelineStage === "planning";
  const activitiesLoading =
    hasLiveTranscript &&
    cards.length === 0 &&
    (pipelineBusy || regen === "loading");
  const suggestFailed =
    hasLiveTranscript &&
    cards.length === 0 &&
    !pipelineBusy &&
    (regen === "error" || pipelineStage === "ready" || pipelineStage === "error");
  const peopleLoading =
    hasLiveTranscript &&
    similarPeople.length === 0 &&
    (pipelineStage === "people" ||
      pipelineStage === "syncing" ||
      (pipelineStage === "ready" && regen === "loading"));

  useEffect(() => {
    router.prefetch("/activity/edit");
  }, [router]);

  useEffect(() => {
    if (cards.length > 0) {
      setRegen("ready");
      return;
    }
    if (pipelineBusy) return;

    const visibleTopics = state.topics
      .filter((t) => !t.hidden)
      .map((t) => ({
        title: t.title,
        explanation: t.explanation,
        tags: t.tags,
      }));
    if (visibleTopics.length === 0) return;

    const sig = topicSignature(visibleTopics);
    const cached = getCached(sig);
    if (cached) {
      setSuggestedActivities(cached);
      setRegen("ready");
      return;
    }

    let cancelled = false;
    setRegen("loading");
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
        }),
      });
      if (!r.ok) throw new Error(`Suggest failed (${r.status})`);
      const data = (await r.json()) as { activities?: RawSuggestedActivity[] };
      const list = Array.isArray(data.activities) ? data.activities : [];
      if (list.length === 0) throw new Error("Empty activities");
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
        console.warn("Suggestions regen failed", err);
        setRegen("error");
      });

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, [
    cards.length,
    pipelineBusy,
    state.topics,
    state.transcript,
    state.signup.availability,
    state.minorInterests,
    setSuggestedActivities,
    retryTick,
  ]);

  const retrySuggest = useCallback(() => {
    const visibleTopics = state.topics
      .filter((t) => !t.hidden)
      .map((t) => ({
        title: t.title,
        explanation: t.explanation,
        tags: t.tags,
      }));
    if (visibleTopics.length === 0) return;
    clearCached(topicSignature(visibleTopics));
    setRetryTick((t) => t + 1);
  }, [state.topics]);

  function reasonFor(a: Activity): string {
    return a.note || a.description || "";
  }

  function start(a: Activity) {
    setActivity(a);
    markActivityForSync(a.id);
    router.push("/activity/edit");
  }

  return (
    <AppShell back="/themes" title="Suggested for you">
      <h1 className="display text-[28px] leading-tight mb-1">
        Suggested for you
      </h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-3">
        {cards.length > 0
          ? `${cards.length} ideas from what you talked about — pick any, edit, or skip.`
          : "Activities based on your voice profile will appear here."}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
        {cards.length > 0 && (
          <p className="text-[12px] text-[var(--color-sage-deep)] inline-flex items-center gap-1.5">
            <Sparkles size={12} /> Generated from your voice profile
          </p>
        )}
        <GhostButton onClick={() => router.push("/themes")}>
          Edit interests
        </GhostButton>
      </div>

      {isDemo && (
        <Link href="/invite" className="block mb-5">
          <Card className="relative !p-0 overflow-hidden hover:translate-y-[-1px] transition-transform">
            <div className="flex items-stretch">
              <div className="w-1.5 bg-[var(--color-sage)]" />
              <div className="flex-1 py-4 pl-4 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="grid place-items-center h-7 w-7 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
                    <Mail size={14} />
                  </span>
                  <p className="text-[11.5px] uppercase tracking-wider text-[var(--color-sage-deep)] font-medium">
                    Invitation arrived
                  </p>
                  <span className="relative inline-flex h-2 w-2 ml-auto mr-1">
                    <span className="absolute inset-0 rounded-full bg-[var(--color-sage)] animate-ping" />
                    <span className="relative h-2 w-2 rounded-full bg-[var(--color-sage)]" />
                  </span>
                </div>
                <p className="display text-[17px] leading-snug mb-1">
                  {incomingInviteActivity.title}
                </p>
                <p className="text-[12.5px] text-[var(--color-ink-soft)]">
                  {formatDayTime(
                    incomingInviteActivity.day,
                    incomingInviteActivity.time,
                  )}{" "}
                  · {incomingInviteActivity.group_size_target} people ·{" "}
                  {incomingInviteActivity.location_area}
                </p>
                <p className="text-[12px] text-[var(--color-muted)] mt-1.5">
                  Another HOMING user started this — tap to see how it looks from
                  the other side.
                </p>
              </div>
              <div className="grid place-items-center pr-4 text-[var(--color-muted)]">
                <ChevronRight size={18} />
              </div>
            </div>
          </Card>
        </Link>
      )}

      {activitiesLoading ? (
        <div className="grid gap-4 mb-6">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="animate-pulse">
              <div className="h-5 w-2/3 bg-[var(--color-cream-warm)] rounded mb-3" />
              <div className="h-4 w-full bg-[var(--color-cream-warm)] rounded mb-2" />
              <div className="h-4 w-4/5 bg-[var(--color-cream-warm)] rounded" />
            </Card>
          ))}
          <p className="text-[13px] text-[var(--color-muted)] text-center">
            Still drafting from your voice… {pipelineStageLabel(pipelineStage)}
          </p>
        </div>
      ) : suggestFailed ? (
        <Card className="text-center py-8 px-5">
          <p className="text-[14px] text-[var(--color-ink-soft)] mb-4 leading-relaxed">
            {regen === "error"
              ? "Homi couldn't draft activities from your interests. This is usually temporary — try again."
              : "Homi is still drafting activities from your voice. Try again in a moment, or edit your interests."}
          </p>
          <div className="flex flex-col gap-2">
            <SecondaryButton onClick={retrySuggest}>
              <RotateCcw size={14} /> Try again
            </SecondaryButton>
            <SecondaryButton onClick={() => router.push("/themes")}>
              Edit interests
            </SecondaryButton>
            <GhostButton onClick={() => router.push("/voice")}>
              Record again
            </GhostButton>
          </div>
        </Card>
      ) : cards.length === 0 ? (
        <Card className="text-center py-8 px-5">
          <p className="text-[14px] text-[var(--color-ink-soft)] mb-4 leading-relaxed">
            Record your voice first — Homi needs that to draft activities for you.
          </p>
          <GhostButton onClick={() => router.push("/voice")}>
            <RotateCcw size={14} /> Record your voice
          </GhostButton>
        </Card>
      ) : (
        <div className="grid gap-4 stagger">
          {cards.map((a) => (
            <Card
              key={a.id}
              interactive
              className="cursor-pointer"
              onClick={() => start(a)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="display text-[19px] leading-tight">{a.title}</p>
                <span className="pill !bg-[var(--color-sage-soft)] !text-[var(--color-sage-deep)] !border-transparent">
                  fits you
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-[var(--color-ink-soft)] mb-3">
                {a.day && a.time && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} /> {formatDayTime(a.day, a.time)} ·{" "}
                    {formatDuration(a.duration)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users size={13} /> {a.group_size_target} people
                </span>
                {a.location_area && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} /> {a.location_area}
                  </span>
                )}
              </div>
              {reasonFor(a) && (
                <p className="text-[13px] text-[var(--color-muted)] leading-relaxed mb-4">
                  <span className="text-[var(--color-sage-deep)] font-medium">
                    Because you said:{" "}
                  </span>
                  {reasonFor(a)}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[
                  ...(a.specific_interest_tags ?? []),
                  ...(a.broader_interest_tags ?? []),
                ]
                  .slice(0, 4)
                  .map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => start(a)}
                  className="btn-primary !py-2.5 !text-[13.5px] flex-1"
                >
                  Start this
                </button>
                <button
                  onClick={() => start(a)}
                  className="btn-secondary !py-2.5 !text-[13.5px] !w-auto px-4"
                >
                  Edit
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasLiveTranscript && (
        <section className="mt-10 pt-5 border-t border-[var(--color-line)]/80">
          <h2 className="text-[16px] font-medium text-[var(--color-ink-soft)] mb-0.5">
            Who is similar to you?
          </h2>
          <p className="text-[12px] text-[var(--color-muted)] mb-3">
            Optional — people in the network who share your interests. Names
            show for people who chose to share theirs.
          </p>
          {peopleLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="card animate-pulse h-16 bg-[var(--color-cream-warm)]"
                />
              ))}
              <p className="text-[12.5px] text-[var(--color-muted)] text-center">
                <ThinkingDots size="small" /> Finding similar people…
              </p>
            </div>
          ) : similarPeople.length > 0 ? (
            <div className="grid gap-3 stagger">
              {similarPeople.map((p) => {
                const rareTopic = p.rare?.[0];
                return (
                  <Card key={p.user_id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="display text-[17px]">{p.first_name}</p>
                        <p className="text-[12.5px] text-[var(--color-muted)]">
                          {p.neighbourhood}
                        </p>
                      </div>
                      <span className="pill !text-[11px] !bg-[var(--color-sage-soft)] !text-[var(--color-sage-deep)] !border-transparent">
                        {typeof p.sync === "number" && p.sync > 0
                          ? `${p.sync}% in sync`
                          : "shares interests"}
                      </span>
                    </div>
                    {rareTopic && (
                      <p className="text-[12px] text-[var(--color-sage-deep)] mt-2 inline-flex items-center gap-1.5">
                        <Sparkles size={11} />
                        Rare match — you two might be the only ones into{" "}
                        {rareTopic} here.
                      </p>
                    )}
                    {(p.shared?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {p.shared!.slice(0, 3).map((s) => (
                          <Pill key={s}>{s}</Pill>
                        ))}
                      </div>
                    ) : p.reasons.length > 0 ? (
                      <p className="text-[12.5px] text-[var(--color-ink-soft)] mt-2 leading-relaxed">
                        {p.reasons.slice(0, 2).join(" · ")}
                      </p>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          ) : pipelineStage === "ready" ? (
            <Card className="text-[13px] text-[var(--color-muted)] py-5 text-center">
              You&apos;re the first one here with these interests. They&apos;re
              saved — Homi connects you the moment someone who fits joins the
              flock.
            </Card>
          ) : null}
        </section>
      )}

      {isCollect && (
        <div className="mt-8 pt-6 border-t border-[var(--color-line)]">
          <p className="text-[13px] text-[var(--color-muted)] mb-4 text-center leading-relaxed">
            You&apos;ve seen your interests, activities, and who&apos;s similar —
            ready to join the flock?
          </p>
          <button
            type="button"
            onClick={() => router.push("/collect/done")}
            className="btn-primary w-full"
          >
            Join the flock
          </button>
        </div>
      )}
    </AppShell>
  );
}
