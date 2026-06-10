"use client";

import { Check, Clock, MapPin, Users } from "lucide-react";
import { Card, Pill } from "@/components/Bits";
import { ThinkingDots } from "@/components/Loading";
import type { Activity } from "@/lib/types";
import type { PipelineStage, SimilarPerson } from "@/lib/voicePipeline";
import { pipelineStageLabel } from "@/lib/voicePipeline";
import { formatDayTime, formatDuration } from "@/lib/formatActivity";

interface TopicLike {
  id: string;
  title: string;
  explanation: string;
  tags: string[];
  hidden?: boolean;
}

function stageIndex(stage: PipelineStage, showActivities: boolean): number {
  if (!showActivities) {
    switch (stage) {
      case "idle":
        return -1;
      case "transcribing":
        return 0;
      case "understanding":
        return 1;
      case "planning":
        return 1;
      case "syncing":
      case "people":
        return 2;
      case "ready":
      case "error":
        return 3;
      default:
        return -1;
    }
  }
  switch (stage) {
    case "idle":
      return -1;
    case "transcribing":
      return 0;
    case "understanding":
      return 1;
    case "planning":
      return 2;
    case "syncing":
    case "people":
      return 3;
    case "ready":
    case "error":
      return 4;
    default:
      return -1;
  }
}

function StageChip({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={
        "flex items-center gap-1 transition-colors duration-300 " +
        (done || active
          ? "text-[var(--color-sage-deep)]"
          : "text-[var(--color-muted)]")
      }
    >
      <span
        className={
          "grid place-items-center h-[18px] w-[18px] rounded-full transition-colors duration-300 " +
          (done
            ? "bg-[var(--color-sage)] text-white"
            : active
              ? "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]"
              : "bg-[var(--color-cream-warm)] text-[var(--color-muted)]")
        }
      >
        {done ? (
          <Check size={10} strokeWidth={3} className="animate-pop-check" />
        ) : active ? (
          <span
            className="animate-spin-soft"
            style={{ width: 9, height: 9 }}
            aria-hidden
          />
        ) : (
          <span className="block h-1 w-1 rounded-full bg-current opacity-50" />
        )}
      </span>
      <span className="text-[10.5px] font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <span
      className={
        "block h-px w-3 shrink-0 transition-colors duration-300 " +
        (active ? "bg-[var(--color-sage)]" : "bg-[var(--color-line)]")
      }
    />
  );
}

export function PipelineStrip({
  stage,
  showActivities = true,
}: {
  stage: PipelineStage;
  showActivities?: boolean;
}) {
  const idx = stageIndex(stage, showActivities);
  const labels = showActivities
    ? (["Transcribe", "Interests", "Activities", "People"] as const)
    : (["Transcribe", "Interests", "People"] as const);

  return (
    <div
      className="flex items-center justify-center gap-1.5 mb-4 px-2 py-2.5 rounded-2xl bg-[var(--color-paper)] border border-[var(--color-line)] overflow-x-auto"
      aria-live="polite"
    >
      {labels.map((label, i) => {
        const done = idx > i || stage === "ready";
        const active = idx === i && stage !== "ready" && stage !== "error";
        return (
          <span key={label} className="contents">
            {i > 0 && <Connector active={idx >= i} />}
            <StageChip label={label} active={active} done={done} />
          </span>
        );
      })}
    </div>
  );
}

function InterestSkeletons() {
  return (
    <div className="grid gap-2">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="card animate-pulse h-16 bg-[var(--color-cream-warm)]"
        />
      ))}
    </div>
  );
}

function ActivitySkeletons() {
  return (
    <div className="grid gap-2">
      {[1, 2].map((n) => (
        <div
          key={n}
          className="card animate-pulse h-20 bg-[var(--color-cream-warm)]"
        />
      ))}
      <p className="text-[12px] text-[var(--color-muted)] text-center">
        <ThinkingDots size="small" /> Drafting activities…
      </p>
    </div>
  );
}

function PeopleSkeletons() {
  return (
    <div className="grid gap-2">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="card animate-pulse h-14 bg-[var(--color-cream-warm)]"
        />
      ))}
      <p className="text-[12px] text-[var(--color-muted)] text-center">
        <ThinkingDots size="small" /> Finding similar people…
      </p>
    </div>
  );
}

function ActivityPreview({ activity }: { activity: Activity }) {
  return (
    <Card className="!p-3.5">
      <p className="display text-[15px] leading-snug mb-1.5">{activity.title}</p>
      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[12px] text-[var(--color-ink-soft)]">
        {activity.day && activity.time && (
          <span className="inline-flex items-center gap-1">
            <Clock size={11} /> {formatDayTime(activity.day, activity.time)} ·{" "}
            {formatDuration(activity.duration)}
          </span>
        )}
        {activity.location_area && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} /> {activity.location_area}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users size={11} /> {activity.group_size_target} people
        </span>
      </div>
    </Card>
  );
}

function PersonPreview({ person }: { person: SimilarPerson }) {
  return (
    <Card className="!p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="display text-[15px]">{person.first_name}</p>
          <p className="text-[12px] text-[var(--color-muted)]">
            {person.neighbourhood}
          </p>
        </div>
        <span className="pill !text-[10px]">{person.score} pts overlap</span>
      </div>
      {person.reasons.length > 0 && (
        <p className="text-[12px] text-[var(--color-ink-soft)] mt-1.5 leading-relaxed">
          {person.reasons.slice(0, 2).join(" · ")}
        </p>
      )}
    </Card>
  );
}

export function ProgressiveResults({
  pipelineStage,
  pipelineError,
  topics,
  suggestedActivities,
  similarPeople,
  showActivities = true,
  compact = false,
}: {
  pipelineStage: PipelineStage;
  pipelineError: string | null;
  topics: TopicLike[];
  suggestedActivities: Activity[];
  similarPeople: SimilarPerson[];
  showActivities?: boolean;
  compact?: boolean;
}) {
  const visibleTopics = topics.filter((t) => !t.hidden);
  const hasTranscriptFlow =
    pipelineStage !== "idle" || visibleTopics.length > 0;

  if (!hasTranscriptFlow) return null;

  const interestsLoading =
    visibleTopics.length === 0 &&
    (pipelineStage === "transcribing" || pipelineStage === "understanding");
  const showInterests =
    interestsLoading || visibleTopics.length > 0 || pipelineStage === "error";

  const activitiesLoading =
    showActivities &&
    suggestedActivities.length === 0 &&
    pipelineStage === "planning";
  const showActivitiesSection =
    showActivities &&
    (activitiesLoading ||
      suggestedActivities.length > 0 ||
      pipelineStage === "syncing" ||
      pipelineStage === "people" ||
      pipelineStage === "ready");

  const peopleLoading =
    similarPeople.length === 0 &&
    (pipelineStage === "people" || pipelineStage === "syncing");
  const showPeople =
    peopleLoading ||
    similarPeople.length > 0 ||
    pipelineStage === "ready" ||
    pipelineStage === "syncing" ||
    pipelineStage === "people";

  const statusLabel = pipelineError
    ? pipelineError
    : pipelineStageLabel(pipelineStage);

  return (
    <div className={compact ? "mt-6 pt-5 border-t border-[var(--color-line)]" : "mt-8"}>
      {!compact && (
        <p
          className={
            "text-center text-[12.5px] mb-4 " +
            (pipelineError
              ? "text-[var(--color-clay)]"
              : pipelineStage === "ready"
                ? "text-[var(--color-sage-deep)]"
                : "text-[var(--color-muted)]")
          }
        >
          {statusLabel}
        </p>
      )}

      {showInterests && (
        <section className="mb-5 animate-fade-in-soft">
          <h2 className="display text-[18px] mb-0.5">Your interests</h2>
          <p className="text-[12.5px] text-[var(--color-muted)] mb-3">
            {visibleTopics.length > 0
              ? `${visibleTopics.length} topic${visibleTopics.length === 1 ? "" : "s"} from your voice`
              : "Homi is pulling these out now…"}
          </p>
          {interestsLoading ? (
            <InterestSkeletons />
          ) : (
            <div className="grid gap-2 stagger">
              {visibleTopics.slice(0, compact ? 4 : 6).map((t) => (
                <Card key={t.id} className="!p-3.5">
                  <p className="display text-[15px] mb-0.5">{t.title}</p>
                  <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed line-clamp-2">
                    {t.explanation}
                  </p>
                  {t.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.tags.slice(0, 3).map((tag) => (
                        <Pill key={tag}>{tag}</Pill>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
              {visibleTopics.length > (compact ? 4 : 6) && (
                <p className="text-[12px] text-[var(--color-muted)] text-center">
                  +{visibleTopics.length - (compact ? 4 : 6)} more on the next
                  screen
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {showActivitiesSection && (
        <section className="mb-5 animate-fade-in-soft">
          <h2 className="display text-[18px] mb-0.5">Activities for you</h2>
          <p className="text-[12.5px] text-[var(--color-muted)] mb-3">
            {suggestedActivities.length > 0
              ? "Things you could actually do — based on what you said"
              : "Homi is drafting ideas from your interests…"}
          </p>
          {activitiesLoading && suggestedActivities.length === 0 ? (
            <ActivitySkeletons />
          ) : suggestedActivities.length > 0 ? (
            <div className="grid gap-2 stagger">
              {suggestedActivities.slice(0, compact ? 2 : 3).map((a) => (
                <ActivityPreview key={a.id} activity={a} />
              ))}
              {suggestedActivities.length > (compact ? 2 : 3) && (
                <p className="text-[12px] text-[var(--color-muted)] text-center">
                  +{suggestedActivities.length - (compact ? 2 : 3)} more on the
                  next screen
                </p>
              )}
            </div>
          ) : null}
        </section>
      )}

      {showPeople && (
        <section className="animate-fade-in-soft">
          <h2 className="display text-[18px] mb-0.5">
            Who is similar to you?
          </h2>
          <p className="text-[12.5px] text-[var(--color-muted)] mb-3">
            People in the network who share your interests
          </p>
          {peopleLoading ? (
            <PeopleSkeletons />
          ) : similarPeople.length > 0 ? (
            <div className="grid gap-2 stagger">
              {similarPeople.slice(0, compact ? 2 : 3).map((p) => (
                <PersonPreview key={p.user_id} person={p} />
              ))}
            </div>
          ) : pipelineStage === "ready" ? (
            <Card className="!p-3.5 text-[12.5px] text-[var(--color-muted)] text-center">
              No one in the network shares these interests yet — you might be
              first.
            </Card>
          ) : null}
        </section>
      )}
    </div>
  );
}
