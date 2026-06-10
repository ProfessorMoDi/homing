"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
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

export default function Suggestions() {
  const router = useRouter();
  const {
    state,
    setActivity,
    markActivityForSync,
    pipelineStage,
    similarPeople,
  } = useApp();
  const isDemo = useAppMode() === "demo";

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
        topicOrder.get(a.specific_interest_tags[0]?.toLowerCase() ?? "") ??
        999;
      const bi =
        topicOrder.get(b.title.toLowerCase()) ??
        topicOrder.get(b.specific_interest_tags[0]?.toLowerCase() ?? "") ??
        999;
      return ai - bi;
    });
    return list;
  }, [state.suggestedActivities, topicOrder]);

  const hasLiveTranscript = !!state.transcript.trim();
  const activitiesLoading =
    hasLiveTranscript &&
    cards.length === 0 &&
    (pipelineStage === "planning" ||
      pipelineStage === "understanding" ||
      pipelineStage === "syncing");
  const peopleLoading =
    hasLiveTranscript &&
    similarPeople.length === 0 &&
    (pipelineStage === "people" || pipelineStage === "syncing");

  useEffect(() => {
    router.prefetch("/activity/edit");
  }, [router]);

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
      {cards.length > 0 && (
        <p className="text-[12px] text-[var(--color-sage-deep)] inline-flex items-center gap-1.5 mb-5">
          <Sparkles size={12} /> Generated from your voice profile
        </p>
      )}

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
      ) : cards.length === 0 ? (
        <Card className="text-center py-8 px-5">
          <p className="text-[14px] text-[var(--color-ink-soft)] mb-4 leading-relaxed">
            {hasLiveTranscript
              ? "Homi didn't finish drafting activities yet. Go back to themes to retry, or record again."
              : "Load a sample voice profile or record to see personalized suggestions."}
          </p>
          <div className="flex flex-col gap-2">
            <SecondaryButton onClick={() => router.push("/themes")}>
              Back to themes
            </SecondaryButton>
            <GhostButton onClick={() => router.push("/voice")}>
              <RotateCcw size={14} /> Record again
            </GhostButton>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 stagger">
          {cards.map((a) => (
            <Card key={a.id} interactive>
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
                {[...a.specific_interest_tags, ...a.broader_interest_tags]
                  .slice(0, 4)
                  .map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
              </div>
              <div className="flex gap-2">
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
                <button
                  onClick={() => router.back()}
                  className="btn-ghost !text-[13.5px]"
                >
                  Not now
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasLiveTranscript && (
        <section className="mt-8 pt-6 border-t border-[var(--color-line)]">
          <h2 className="display text-[20px] mb-1">People like you</h2>
          <p className="text-[13px] text-[var(--color-muted)] mb-4">
            In the network who share your interests — overlap, not a perfect
            match yet.
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
              {similarPeople.map((p) => (
                <Card key={p.user_id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="display text-[17px]">{p.first_name}</p>
                      <p className="text-[12.5px] text-[var(--color-muted)]">
                        {p.neighbourhood}
                      </p>
                    </div>
                    <span className="pill !text-[11px]">
                      {p.score} pts overlap
                    </span>
                  </div>
                  {p.reasons.length > 0 && (
                    <p className="text-[12.5px] text-[var(--color-ink-soft)] mt-2 leading-relaxed">
                      {p.reasons.slice(0, 2).join(" · ")}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          ) : pipelineStage === "ready" ? (
            <Card className="text-[13px] text-[var(--color-muted)] py-5 text-center">
              No one in the network shares these interests yet — you might be
              first. Pick an activity to start inviting.
            </Card>
          ) : null}
        </section>
      )}
    </AppShell>
  );
}
