"use client";

import Link from "next/link";
import { Heart, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import { useApp } from "@/lib/store";

function activityNoun(title: string): string {
  const cleaned = title
    .replace(/^(start a |start the |try a |try the |begin a |begin the |a |the )/i, "")
    .trim();
  return cleaned || "this";
}

function classify(state: ReturnType<typeof useApp>["state"]) {
  const fb = state.feedback;
  const rating = fb.activityRating ?? 0;
  const likedActivity = rating >= 4;
  const dislikedActivity = rating > 0 && rating <= 2;
  const peopleVals = Object.values(fb.people || {});
  const hasAvoid = peopleVals.includes("avoid");
  const mostlyAgain =
    peopleVals.length > 0 &&
    peopleVals.filter((v) => v === "again").length >=
      Math.max(2, peopleVals.length - 1);

  if (dislikedActivity) return "d" as const;
  if (likedActivity && mostlyAgain && !hasAvoid) return "a" as const;
  if (likedActivity && (hasAvoid || !mostlyAgain)) return "b" as const;
  if (hasAvoid) return "c" as const;
  return "b" as const;
}

export default function FeedbackResult() {
  const { state } = useApp();
  const outcome = classify(state);
  const noun = activityNoun(state.activity.title);

  return (
    <AppShell back="/feedback" title="Thanks">
      <div className="relative h-28 mb-4 grid place-items-center">
        <div className="animate-float">
          <Pigeon size={84} />
        </div>
      </div>

      {outcome === "a" && (
        <>
          <h1 className="display text-[26px] mb-1 text-center">
            Looks like this round worked well.
          </h1>
          <p className="text-[13.5px] text-[var(--color-muted)] text-center mb-6">
            Want to make {noun} a recurring thing?
          </p>
          <div className="grid gap-2 mb-7">
            <PrimaryButton>Same people, same activity</PrimaryButton>
            <SecondaryButton>Same people, try something similar</SecondaryButton>
            <SecondaryButton>Keep me matched with some of them</SecondaryButton>
            <button className="btn-ghost">Not now</button>
          </div>
          <Link href="/group">
            <SecondaryButton>
              <Heart size={14} /> See recurring group
            </SecondaryButton>
          </Link>
        </>
      )}

      {outcome === "b" && (
        <>
          <h1 className="display text-[24px] mb-1 text-center">
            Good activity, different mix next time?
          </h1>
          <p className="text-[13.5px] text-[var(--color-muted)] text-center mb-6">
            HOMING can suggest another {noun} with some new people.
          </p>
          <div className="grid gap-2 mb-7">
            <PrimaryButton>Try similar activity</PrimaryButton>
            <SecondaryButton>Keep some matches</SecondaryButton>
            <button className="btn-ghost">Not now</button>
          </div>
        </>
      )}

      {outcome === "c" && (
        <>
          <h1 className="display text-[22px] mb-1 text-center">Got it.</h1>
          <p className="text-[13.5px] text-[var(--color-muted)] text-center mb-6 px-2">
            HOMING will avoid pairing you with that person in future activities.
            We never notify them or surface it publicly.
          </p>
          <Card className="mb-7 !bg-[var(--color-cream-warm)] !border-transparent">
            <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
              You can change this anytime in private comfort preferences.
            </p>
          </Card>
          <Link href="/suggestions">
            <PrimaryButton>See new suggestions</PrimaryButton>
          </Link>
        </>
      )}

      {outcome === "d" && (
        <>
          <h1 className="display text-[22px] mb-1 text-center">Got it.</h1>
          <p className="text-[13.5px] text-[var(--color-muted)] text-center mb-6">
            HOMING will suggest different activities next time.
          </p>
          <div className="grid gap-2">
            <Link href="/suggestions">
              <PrimaryButton>See new suggestions</PrimaryButton>
            </Link>
            <Link href="/voice">
              <SecondaryButton>
                <RotateCcw size={14} /> Record again
              </SecondaryButton>
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}
