"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Angry, Frown, Meh, Smile, Laugh } from "lucide-react";
import { AppShell, StepDots } from "@/components/AppShell";
import { Card, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";

const RATINGS = [
  { value: 1, Icon: Angry, label: "Not my thing" },
  { value: 2, Icon: Frown, label: "Below expectations" },
  { value: 3, Icon: Meh, label: "It was okay" },
  { value: 4, Icon: Smile, label: "I liked it" },
  { value: 5, Icon: Laugh, label: "I'd absolutely do this again" },
] as const;

const PEOPLE_OPTIONS = [
  ["again", "Yes, invite us together again"],
  ["neutral", "Neutral / no preference"],
  ["avoid", "Prefer not to be matched again"],
] as const;

export default function Feedback() {
  const router = useRouter();
  const { state, setFeedback, submitFeedback, acceptedInvitees } = useApp();
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState<number | undefined>(
    state.feedback.activityRating,
  );
  const [eventNote, setEventNote] = useState<string>(
    state.feedback.eventNote ?? "",
  );
  const [peopleFb, setPeopleFb] = useState<
    Record<string, "again" | "neutral" | "avoid">
  >(state.feedback.people);
  const [notes, setNotes] = useState<string>(state.feedback.notes ?? "");

  function next() {
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setFeedback({
      activityRating: rating,
      eventNote: eventNote.trim() || undefined,
      people: peopleFb,
      notes: notes.trim() || undefined,
    });
    // Fire graph sync once feedback state is finalised. setState is sync so
    // submitFeedback reads the just-patched values via its setState updater.
    submitFeedback();
    router.push("/feedback/result");
  }

  const selectedLabel = rating
    ? RATINGS.find((r) => r.value === rating)?.label
    : "Tap to rate";

  return (
    <AppShell back="/reminder" title="Quick feedback">
      <div className="mb-5">
        <StepDots total={3} current={step} />
      </div>

      {step === 0 && (
        <>
          <h1 className="display text-[22px] mb-1">How was the activity?</h1>
          <p className="text-[13.5px] text-[var(--color-muted)] mb-6">
            One tap. Private to you.
          </p>

          <Card className="mb-4 !py-8">
            <div className="flex items-center justify-between gap-2 px-1">
              {RATINGS.map(({ value, Icon }) => {
                const selected = rating === value;
                return (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    aria-label={`${value} out of 5`}
                    className={
                      "grid place-items-center h-14 w-14 rounded-full transition-all duration-200 " +
                      (selected
                        ? "bg-[var(--color-sage-soft)] scale-110"
                        : "hover:bg-[var(--color-cream-warm)]")
                    }
                  >
                    <Icon
                      size={selected ? 30 : 28}
                      strokeWidth={1.8}
                      className={
                        selected
                          ? "text-[var(--color-sage-deep)]"
                          : "text-[var(--color-muted)]"
                      }
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[11px] text-[var(--color-muted)] px-2 mt-3 tabular-nums">
              {RATINGS.map(({ value }) => (
                <span key={value} className="w-14 text-center">
                  {value}
                </span>
              ))}
            </div>
            <p className="text-center mt-5 text-[14.5px] font-medium min-h-[1.4em]">
              {selectedLabel}
            </p>
          </Card>
        </>
      )}

      {step === 1 && (
        <>
          <h1 className="display text-[22px] mb-1">How did the setup feel?</h1>
          <p className="text-[13.5px] text-[var(--color-muted)] mb-5">
            A few words — anything about the time, the place, the pace, or the
            vibe.
          </p>
          <textarea
            className="field min-h-40 mb-3"
            placeholder="The board game café was easy to find. We probably could have stopped half an hour earlier — felt about right otherwise."
            value={eventNote}
            onChange={(e) => setEventNote(e.target.value)}
          />
          <p className="text-[12px] text-[var(--color-muted)] mb-7">
            Write as much or as little as you want. Skipping is fine too.
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="display text-[22px] mb-1">
            Would you be comfortable meeting with these people again?
          </h1>
          <p className="text-[13.5px] text-[var(--color-muted)] mb-3">
            Private. HOMING never shows this to the other person.
          </p>
          <Card className="!bg-[var(--color-cream-warm)] !border-transparent flex items-center gap-2 mb-5">
            <ShieldCheck size={16} className="text-[var(--color-sage-deep)]" />
            <p className="text-[12.5px] text-[var(--color-ink-soft)]">
              No public scores. No notifications to anyone else.
            </p>
          </Card>
          <div className="grid gap-3 mb-5">
            {acceptedInvitees.map((u) => {
              const id = u.id;
              const current = peopleFb[id];
              return (
                <Card key={id}>
                  <p className="text-[14.5px] font-medium mb-2">
                    {u.first_name}
                  </p>
                  <div className="grid gap-1.5">
                    {PEOPLE_OPTIONS.map(([k, label]) => (
                      <button
                        key={k}
                        className={
                          "rounded-xl border px-3 py-2 text-left text-[13.5px] transition-colors " +
                          (current === k
                            ? "border-[var(--color-sage)] bg-[var(--color-sage)] text-white"
                            : "border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-cream-warm)]")
                        }
                        onClick={() =>
                          setPeopleFb((p) => ({ ...p, [id]: k }))
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
          <label className="label">Anything HOMING should remember?</label>
          <textarea
            className="field min-h-20 mb-7"
            placeholder="Optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </>
      )}

      <div className="grid gap-2">
        <PrimaryButton
          onClick={next}
          disabled={step === 0 && !rating}
        >
          {step < 2 ? "Continue" : "Submit feedback"}
        </PrimaryButton>
        {step === 0 && (
          <SecondaryButton onClick={() => router.push("/feedback/result")}>
            Skip
          </SecondaryButton>
        )}
      </div>
    </AppShell>
  );
}
