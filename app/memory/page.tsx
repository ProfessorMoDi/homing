"use client";

import { useState } from "react";
import { Heart, Slash, EyeOff } from "lucide-react";
import { AppShell, Section } from "@/components/AppShell";
import { Card, Pill, GhostButton } from "@/components/Bits";

interface Item {
  label: string;
  hint?: string;
}

const initial = {
  activities: ["Catan", "Board games", "Strategy games", "Coffee meetups"],
  preferred: ["Franz", "Lena", "Sophie"],
  avoid: [{ label: "Private comfort preference", hint: "1 person" }] as Item[],
  languages: ["English", "German"],
  availability: ["Thursday evening", "Weekday evenings"],
  hidden: ["Marathon training"],
};

export default function Memory() {
  const [state, setState] = useState(initial);

  return (
    <AppShell back="/" title="Private matching memory">
      <p className="text-[13.5px] text-[var(--color-muted)] mb-5">
        Everything HOMING uses to suggest activities for you. Edit, hide, or
        remove anything.
      </p>

      <Section title="Activities you like" subtitle="Boosts future suggestions">
        <div className="flex flex-wrap gap-1.5">
          {state.activities.map((a) => (
            <button key={a} className="chip" data-selected="true">
              <Heart size={12} /> {a}
              <span className="opacity-60 ml-1">×</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="People you met and would meet again">
        <div className="flex flex-wrap gap-1.5">
          {state.preferred.map((p) => (
            <Pill key={p}>{p}</Pill>
          ))}
        </div>
      </Section>

      <Section
        title="Private comfort preferences"
        subtitle="HOMING will not pair you with these people. Nobody is notified."
      >
        <div className="grid gap-2">
          {state.avoid.map((a, i) => (
            <Card key={i} className="flex items-center justify-between !py-3">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center h-7 w-7 rounded-full bg-[var(--color-clay-soft)] text-[#7d4730]">
                  <Slash size={13} />
                </span>
                <div>
                  <p className="text-[13.5px]">{a.label}</p>
                  {a.hint && (
                    <p className="text-[12px] text-[var(--color-muted)]">
                      {a.hint}
                    </p>
                  )}
                </div>
              </div>
              <button className="btn-ghost !text-[12px]">Remove</button>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Languages">
        <div className="flex flex-wrap gap-1.5">
          {state.languages.map((l) => (
            <Pill key={l}>{l}</Pill>
          ))}
        </div>
      </Section>

      <Section title="Availability">
        <div className="flex flex-wrap gap-1.5">
          {state.availability.map((a) => (
            <Pill key={a}>{a}</Pill>
          ))}
        </div>
      </Section>

      <Section title="Hidden from matching">
        <div className="flex flex-wrap gap-1.5">
          {state.hidden.map((h) => (
            <span key={h} className="pill !text-[var(--color-muted)]">
              <EyeOff size={12} /> {h}
            </span>
          ))}
        </div>
      </Section>

      <div className="grid gap-2 mt-7">
        <button className="btn-secondary">Edit interests</button>
        <button className="btn-secondary">Edit availability</button>
        <button className="btn-ghost text-[var(--color-clay)]">
          Delete profile
        </button>
      </div>
    </AppShell>
  );
}
