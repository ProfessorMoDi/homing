"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell, Section } from "@/components/AppShell";
import { Label, PrimaryButton, SecondaryButton, ChipToggle } from "@/components/Bits";
import { useApp } from "@/lib/store";

const ENERGY = [
  "Low-pressure / structured",
  "Relaxed",
  "Lively small group",
  "Creative",
  "Active",
];

const GROUP_SIZES = [3, 4, 5, 6];

const LANGUAGES = ["English", "Dutch", "German"];

function deriveNote(title: string): string {
  const stripped = title
    .trim()
    .replace(/^(start a |start the |try a |try the |begin a |begin the |a |the )/i, "")
    .trim();
  if (!stripped) {
    return "Nothing serious — just a small first round and see how it feels.";
  }
  return `Nothing serious — just one ${stripped} and see how it feels.`;
}

export default function EditActivity() {
  const router = useRouter();
  const { state, setActivity, simulateInvites } = useApp();
  const a = state.activity;
  const [noteOverridden, setNoteOverridden] = useState(false);
  const [asking, setAsking] = useState(false);

  // Warm /activity/finding so navigation after the match resolves is instant.
  useEffect(() => {
    router.prefetch("/activity/finding");
  }, [router]);

  function handleTitleChange(newTitle: string) {
    if (noteOverridden) {
      setActivity({ title: newTitle });
    } else {
      setActivity({ title: newTitle, note: deriveNote(newTitle) });
    }
  }

  function handleNoteChange(newNote: string) {
    setNoteOverridden(true);
    setActivity({ note: newNote });
  }

  function resetNote() {
    setNoteOverridden(false);
    setActivity({ note: deriveNote(a.title) });
  }

  async function ask() {
    if (asking) return;
    setAsking(true);
    // Kick off the graph match before navigating so /activity/finding opens
    // with the ranked group already in hand (and the dev panel timeline in
    // sync). Fail-soft: persistAndMatch swallows graph errors internally.
    await simulateInvites();
    router.push("/activity/finding");
  }

  return (
    <AppShell back="/suggestions" title="Edit activity">
      <Section title="Activity">
        <Label>Title</Label>
        <input
          className="field mb-4"
          value={a.title}
          onChange={(e) => handleTitleChange(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <Label>Short note</Label>
          {noteOverridden && (
            <button
              type="button"
              className="text-[12px] text-[var(--color-sage-deep)] hover:underline"
              onClick={resetNote}
            >
              Match title
            </button>
          )}
        </div>
        <textarea
          className="field min-h-20"
          value={a.note ?? ""}
          onChange={(e) => handleNoteChange(e.target.value)}
        />
        {!noteOverridden && (
          <p className="text-[11.5px] text-[var(--color-muted)] mt-1.5">
            Auto-written from the title. Edit anytime — it stays yours after that.
          </p>
        )}
      </Section>

      <Section title="When">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Day</Label>
            <input
              className="field"
              value={a.day}
              onChange={(e) => setActivity({ day: e.target.value })}
            />
          </div>
          <div>
            <Label>Time</Label>
            <input
              className="field"
              value={a.time}
              onChange={(e) => setActivity({ time: e.target.value })}
            />
          </div>
        </div>
        <Label>Duration</Label>
        <input
          className="field"
          value={a.duration}
          onChange={(e) => setActivity({ duration: e.target.value })}
        />
      </Section>

      <Section title="Where">
        <Label>Location area</Label>
        <input
          className="field"
          value={a.location_area}
          onChange={(e) => setActivity({ location_area: e.target.value })}
        />
      </Section>

      <Section title="Group">
        <Label>Group size</Label>
        <div className="seg mb-4">
          {GROUP_SIZES.map((n) => (
            <ChipToggle
              key={n}
              label={`${n} people`}
              selected={a.group_size_target === n}
              onToggle={() => setActivity({ group_size_target: n })}
            />
          ))}
        </div>
        <Label>Language preference</Label>
        <div className="seg mb-4">
          {LANGUAGES.map((l) => (
            <ChipToggle
              key={l}
              label={l}
              selected={a.language === l}
              onToggle={() => setActivity({ language: l })}
            />
          ))}
        </div>
        <Label>Energy level</Label>
        <div className="seg">
          {ENERGY.map((e) => (
            <ChipToggle
              key={e}
              label={e}
              selected={a.energy_level === e}
              onToggle={() => setActivity({ energy_level: e })}
            />
          ))}
        </div>
      </Section>

      <div className="grid gap-2.5">
        <PrimaryButton onClick={ask} disabled={asking}>
          {asking ? "Matching on the graph…" : "Ask people"}
        </PrimaryButton>
        <SecondaryButton onClick={() => router.push("/suggestions")}>
          Save for later
        </SecondaryButton>
        <button
          className="btn-ghost"
          onClick={() => router.push("/suggestions")}
        >
          Cancel
        </button>
      </div>

      <p className="text-[12px] text-[var(--color-muted)] text-center mt-4">
        You only edit the activity. HOMING handles who to invite.
      </p>
    </AppShell>
  );
}
