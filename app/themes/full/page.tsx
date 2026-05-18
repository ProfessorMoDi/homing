"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, EyeOff, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Pill, PrimaryButton, GhostButton } from "@/components/Bits";
import { useApp } from "@/lib/store";

interface SectionDef {
  id: string;
  title: string;
  content: React.ReactNode;
}

function Collapse({ section, open, onToggle }: { section: SectionDef; open: boolean; onToggle: () => void }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4"
        onClick={onToggle}
      >
        <span className="text-[14.5px] font-medium">{section.title}</span>
        <ChevronDown
          size={18}
          className={"transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>
      {open && <div className="px-5 pb-5 pt-0 text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">{section.content}</div>}
    </Card>
  );
}

export default function ShowMore() {
  const { state, removeTopic, toggleHideTopic } = useApp();
  const [open, setOpen] = useState<Record<string, boolean>>({ minor: true });

  const toggle = (id: string) =>
    setOpen((o) => ({ ...o, [id]: !o[id] }));

  const sections: SectionDef[] = [
    {
      id: "minor",
      title: "Smaller things HOMING noticed",
      content: (
        <ul className="grid gap-2">
          {state.minorInterests.map((m) => (
            <li key={m} className="flex items-center justify-between">
              <span>{m}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "languages",
      title: "Languages",
      content: (
        <div className="flex flex-wrap gap-1.5">
          <Pill>English · spoken</Pill>
          <Pill>German · spoken</Pill>
          <Pill>English · comfortable in group</Pill>
        </div>
      ),
    },
    {
      id: "availability",
      title: "Availability",
      content: (
        <div className="grid gap-2">
          <p>From sign-up: Thursday evening, weekends</p>
          <p>From recording: Thursday evenings preferred, family on weekends</p>
        </div>
      ),
    },
    {
      id: "style",
      title: "Activity style",
      content: (
        <div className="flex flex-wrap gap-1.5">
          {state.activityTypes.map((a) => (
            <Pill key={a}>{a}</Pill>
          ))}
          <Pill>Sit-down</Pill>
          <Pill>Games</Pill>
        </div>
      ),
    },
    {
      id: "rhythm",
      title: "Social rhythm",
      content: (
        <div className="flex flex-wrap gap-1.5">
          <Pill>Quiet small group</Pill>
          <Pill>Structured activity</Pill>
          <Pill>Low-pressure first meeting</Pill>
          <Pill>Activity-led conversation</Pill>
        </div>
      ),
    },
    {
      id: "matching",
      title: "Matching notes",
      content: (
        <p>
          HOMING will favour board game and strategy activities, Thursday
          evenings, English with optional German, and small calm groups.
        </p>
      ),
    },
    {
      id: "transcript",
      title: "Full transcript",
      content: (
        <p className="whitespace-pre-line">{state.transcript || "—"}</p>
      ),
    },
  ];

  return (
    <AppShell back="/themes" title="Show more">
      <p className="text-[13.5px] text-[var(--color-muted)] mb-5">
        Inspect and control everything HOMING extracted. You can edit, remove,
        or hide any item from matching.
      </p>

      <div className="grid gap-3 mb-6">
        {state.topics.map((t) => (
          <Card key={t.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-medium">{t.title}</p>
                <p className="text-[13px] text-[var(--color-muted)] mt-0.5">
                  {t.explanation}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className={"btn-ghost text-[12px] " + (t.hidden ? "text-[var(--color-clay)]" : "")}
                  onClick={() => toggleHideTopic(t.id)}
                  title={t.hidden ? "Show in matching" : "Hide from matching"}
                >
                  <EyeOff size={14} />
                </button>
                <button
                  className="btn-ghost text-[12px] text-[var(--color-clay)]"
                  onClick={() => removeTopic(t.id)}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {t.hidden && (
              <p className="text-[11.5px] text-[var(--color-muted)] mt-2">
                Hidden from matching
              </p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-2.5 mb-7">
        {sections.map((s) => (
          <Collapse
            key={s.id}
            section={s}
            open={!!open[s.id]}
            onToggle={() => toggle(s.id)}
          />
        ))}
      </div>

      <div className="card p-4 mb-6 text-[12.5px] text-[var(--color-ink-soft)] text-center">
        You control what is used.
      </div>

      <Link href="/suggestions">
        <PrimaryButton>Looks good</PrimaryButton>
      </Link>
    </AppShell>
  );
}
