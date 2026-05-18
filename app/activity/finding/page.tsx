"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, MapPin, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, PrimaryButton, Pill } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import { BreathingOrb, Progress, ThinkingDots } from "@/components/Loading";
import { useApp } from "@/lib/store";
import { formatDayTime } from "@/lib/formatActivity";

function buildStages(specificTags: string[], broaderTags: string[]): string[] {
  const primary = specificTags.find(Boolean) || broaderTags.find(Boolean) || "";
  const secondary =
    broaderTags.find((t) => t !== primary) ||
    specificTags.find((t) => t !== primary) ||
    "";
  return [
    "Looking for exact matches",
    primary
      ? `Inviting people who mentioned ${primary}`
      : "Inviting people who said they wanted this",
    secondary
      ? `Checking ${secondary} matches`
      : "Checking broader interest matches",
    "Waiting for replies",
  ];
}

export default function Finding() {
  const router = useRouter();
  const { state, matches } = useApp();
  const a = state.activity;
  const stages = buildStages(a.specific_interest_tags, a.broader_interest_tags);
  const [stage, setStage] = useState(0);
  const [accepted, setAccepted] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 900),
      setTimeout(() => setStage(2), 2000),
      setTimeout(() => setStage(3), 3100),
      setTimeout(() => setAccepted(1), 3800),
      setTimeout(() => setAccepted(2), 4500),
      setTimeout(() => setAccepted(3), 5300),
      setTimeout(() => setStage(4), 5800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const target = a.group_size_target;
  const ready = accepted >= a.minimum_group_size;
  const stagesDone = stage >= stages.length;

  const topMatches = matches.filter((m) => !m.excluded).slice(0, 5);

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

      <Card className="mb-5">
        <p className="text-[14px] font-medium mb-2">
          How HOMING decides who to ask
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Pill>Specific activity match</Pill>
          <Pill>Broader interest match</Pill>
          <Pill>Availability</Pill>
          <Pill>Language comfort</Pill>
          <Pill>Previous positive feedback</Pill>
          <Pill>Private avoid-pairing</Pill>
          <Pill>Light location weight</Pill>
        </div>
      </Card>

      <details className="mb-5">
        <summary className="text-[13px] text-[var(--color-muted)] cursor-pointer">
          Demo: see ranked candidates (debug)
        </summary>
        <div className="grid gap-2 mt-3">
          {topMatches.map((m) => (
            <div
              key={m.user.id}
              className="card-outline p-3 flex items-center justify-between text-[13px]"
            >
              <span className="text-[var(--color-ink)]">
                Candidate · {m.user.first_name.charAt(0)}.
              </span>
              <span className="text-[var(--color-muted)] tabular-nums">
                score {m.score}
              </span>
            </div>
          ))}
        </div>
      </details>

      <PrimaryButton
        onClick={() => router.push("/activity/verify")}
        disabled={!ready}
      >
        {ready ? (
          "Continue to verification"
        ) : (
          <>
            Waiting for replies <ThinkingDots size="small" />
          </>
        )}
      </PrimaryButton>
      <p className="text-[12px] text-[var(--color-muted)] text-center mt-3">
        Names and photos stay hidden until everyone verifies.
      </p>
    </AppShell>
  );
}
