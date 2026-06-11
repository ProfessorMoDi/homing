"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, MapPin, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, PrimaryButton, Pill } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import { BreathingOrb, Progress, ThinkingDots } from "@/components/Loading";
import { useApp } from "@/lib/store";
import { formatDayTime } from "@/lib/formatActivity";

function buildStages(
  specificTags: string[],
  broaderTags: string[],
  graphMatch: boolean,
): string[] {
  const primary = specificTags.find(Boolean) || broaderTags.find(Boolean) || "";
  const secondary =
    broaderTags.find((t) => t !== primary) ||
    specificTags.find((t) => t !== primary) ||
    "";
  if (graphMatch) {
    return [
      "Querying the interest graph",
      primary
        ? `Ranking people who like ${primary}`
        : "Ranking people with overlapping interests",
      secondary
        ? `Expanding via ${secondary} in the ontology`
        : "Checking one-hop related topics",
      "Sending invites in match order",
      "Enough people said yes",
    ];
  }
  return [
    "Looking for exact matches",
    primary
      ? `Inviting people who mentioned ${primary}`
      : "Inviting people who said they wanted this",
    secondary
      ? `Checking ${secondary} matches`
      : "Checking broader interest matches",
    "Group is forming",
  ];
}

export default function Finding() {
  const router = useRouter();
  const { state, matches, matchSource, matchLoading } = useApp();
  const a = state.activity;
  const graphMatch = matchSource === "graph";
  const stages = buildStages(
    a.specific_interest_tags,
    a.broader_interest_tags,
    graphMatch,
  );
  const [stage, setStage] = useState(0);
  const [accepted, setAccepted] = useState(0);

  // Warm the verification route while the match animation plays.
  useEffect(() => {
    router.prefetch("/activity/verify");
  }, [router]);

  const invited = useMemo(
    () =>
      matches
        .filter((m) => !m.excluded && m.score > 0)
        .slice(0, 4),
    [matches],
  );

  const acceptedIds = useMemo(
    () =>
      Object.entries(state.inviteResponses)
        .filter(([, s]) => s === "accepted")
        .map(([id]) => id),
    [state.inviteResponses],
  );

  useEffect(() => {
    if (acceptedIds.length > 0) {
      setAccepted((n) => Math.max(n, acceptedIds.length));
    }
  }, [acceptedIds.length]);

  useEffect(() => {
    if (matchLoading) {
      setStage(0);
      if (acceptedIds.length === 0) setAccepted(0);
      return;
    }

    if (acceptedIds.length >= a.minimum_group_size) {
      setAccepted(acceptedIds.length);
      setStage(stages.length);
      return;
    }

    const timers = [
      setTimeout(() => setStage(1), 700),
      setTimeout(() => setStage(2), 1600),
      setTimeout(() => setStage(3), 2500),
    ];

    const acceptTimers: ReturnType<typeof setTimeout>[] = [];
    invited.forEach((m, i) => {
      acceptTimers.push(
        setTimeout(() => {
          setAccepted((n) => Math.max(n, i + 1));
        }, 3200 + i * 650),
      );
    });

    const doneTimer = setTimeout(
      () => setStage(stages.length),
      3200 + invited.length * 650 + 400,
    );
    timers.push(doneTimer);

    return () => {
      timers.forEach(clearTimeout);
      acceptTimers.forEach(clearTimeout);
    };
  }, [matchLoading, invited, stages.length, acceptedIds.length, a.minimum_group_size]);

  const target = a.group_size_target;
  const ready = accepted >= a.minimum_group_size;
  const stagesDone = stage >= stages.length;

  const topMatches = matches.filter((m) => !m.excluded).slice(0, 6);

  return (
    <AppShell back="/activity/edit" title="Finding people">
      <Card className="mb-5">
        <p className="display text-[18px]">{a.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-[var(--color-ink-soft)] mt-1">
          <span className="inline-flex items-center gap-1">
            <Clock size={13} /> {formatDayTime(a.day, a.time)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={13} /> {a.group_size_target} people
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} /> {a.location_area}
          </span>
        </div>
        {matchLoading ? (
          <p className="text-[12px] text-[var(--color-muted)] mt-2 inline-flex items-center gap-1.5">
            Finding people who fit <ThinkingDots size="small" />
          </p>
        ) : (
          <p className="text-[12px] text-[var(--color-sage-deep)] mt-2">
            Ranked by who fits best
            {topMatches[0]?.reasons[0] ? ` · top: ${topMatches[0].reasons[0]}` : ""}.
          </p>
        )}
      </Card>

      <Card className="mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-14 h-14 shrink-0">
            <BreathingOrb>
              <div className="animate-float">
                <Pigeon size={44} />
              </div>
            </BreathingOrb>
          </div>
          <div className="flex-1">
            <p className="text-[14.5px] font-medium">
              Homi is asking people who fit best.
            </p>
            <p className="text-[12.5px] text-[var(--color-muted)]">
              You stay anonymous until everyone verifies.
            </p>
          </div>
        </div>

        <div
          className="mb-1 flex items-baseline justify-between"
          style={{ ["--p" as string]: accepted / Math.max(target, 1) }}
        >
          <p className="text-[12px] uppercase tracking-wider text-[var(--color-muted)] font-medium">
            Accepted
          </p>
          <p className="text-[13px] tabular-nums">
            <span className="font-semibold">{accepted}</span>
            <span className="text-[var(--color-muted)]"> / {target}</span>
          </p>
        </div>
        <Progress value={accepted} max={target} />

        <div className="grid gap-2 mt-5">
          {stages.map((label, i) => {
            const done = i < stage;
            const active = i === stage && !stagesDone;
            return (
              <div
                key={label}
                className="flex items-center gap-3 text-[13px] animate-slide-in-left"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span
                  className={
                    "grid place-items-center h-5 w-5 rounded-full shrink-0 transition-colors duration-300 " +
                    (done
                      ? "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]"
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
                <span
                  className={
                    "flex-1 transition-colors " +
                    (i <= stage
                      ? "text-[var(--color-ink)]"
                      : "text-[var(--color-muted)]")
                  }
                >
                  {label}
                </span>
                {active && (
                  <ThinkingDots
                    size="small"
                    className="text-[var(--color-sage-deep)]"
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {!matchLoading && topMatches.length === 0 && (
        <Card className="mb-5">
          <p className="text-[14px] font-medium mb-1">No matches yet</p>
          <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
            Nobody in the network shares these interests yet. As more people
            sign up, the ones who fit will show up here.
          </p>
        </Card>
      )}

      {topMatches.length > 0 && (
        <Card className="mb-5">
          <p className="text-[14px] font-medium mb-3">
            {graphMatch ? "Graph-ranked invites" : "Ranked candidates"}
          </p>
          <ul className="grid gap-2.5">
            {topMatches.map((m, i) => {
              const status = state.inviteResponses[m.user.id];
              const isInvited = i < 4;
              return (
                <li
                  key={m.user.id}
                  className="card-outline p-3 text-[13px] flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--color-ink)]">
                      {m.user.first_name}
                      {isInvited ? (
                        <span className="text-[var(--color-muted)] font-normal">
                          {" "}
                          · invited
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums text-[var(--color-sage-deep)] font-semibold shrink-0">
                      {m.score}
                    </span>
                  </div>
                  {m.reasons.length > 0 ? (
                    <p className="text-[12px] text-[var(--color-muted)] leading-snug">
                      {m.reasons.slice(0, 2).join(" · ")}
                    </p>
                  ) : null}
                  {status === "accepted" ? (
                    <p className="text-[11.5px] text-[var(--color-sage-deep)]">
                      Accepted
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card className="mb-5">
        <p className="text-[14px] font-medium mb-2">
          How HOMING decides who to ask
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Pill>Specific activity match</Pill>
          <Pill>Broader interest match</Pill>
          <Pill>Availability</Pill>
          <Pill>Previous positive feedback</Pill>
          <Pill>Private avoid-pairing</Pill>
          <Pill>Light location weight</Pill>
        </div>
      </Card>

      <PrimaryButton
        onClick={() => router.push("/activity/verify")}
        disabled={!ready || matchLoading}
      >
        {matchLoading ? (
          <>
            Matching on the graph <ThinkingDots size="small" />
          </>
        ) : ready ? (
          "Continue to verification"
        ) : (
          <>
            Group is forming <ThinkingDots size="small" />
          </>
        )}
      </PrimaryButton>
      <p className="text-[12px] text-[var(--color-muted)] text-center mt-3">
        Names and photos stay hidden until everyone verifies.
      </p>
    </AppShell>
  );
}
