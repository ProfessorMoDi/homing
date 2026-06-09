"use client";

// Demo-build read-only experience. You pick a few interests, HOMING dives into
// the live network the collect build has filled, and ranks the people you're
// most "in sync" with — with the shared interests spelled out. Writes nothing.
// It's meant to be a little playful: a friends-and-demo compatibility board.

import { useCallback, useState } from "react";
import { Sparkles, ArrowRight, RotateCcw, Wifi } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton, Avatar, Pill } from "@/components/Bits";
import { ThinkingDots } from "@/components/Loading";

// Curated interest chips spanning the taxonomy clusters. Titles canonicalise
// server-side, so the exact casing here doesn't matter.
const CHIPS = [
  "Board games",
  "Catan",
  "Strategy games",
  "Chess",
  "Running",
  "Gym",
  "Football",
  "Outdoors",
  "Walking",
  "Photography",
  "Architecture",
  "Coffee",
  "Study cafés",
  "Cooking",
  "Music production",
  "Techno",
  "Ceramics",
  "Language exchange",
];

interface Candidate {
  user_id: string;
  first_name: string;
  neighbourhood: string;
  score: number;
  sync: number;
  shared_count: number;
  shared: string[];
  reasons: string[];
}

const AVATAR_COLORS = ["sage", "clay", "sky", "sand"] as const;

function vibe(sync: number): string {
  if (sync >= 80) return "practically interest-twins";
  if (sync >= 60) return "a strong overlap";
  if (sync >= 40) return "a few good things in common";
  return "a spark or two to build on";
}

function rankLabel(i: number): string {
  if (i === 0) return "Your closest match";
  if (i === 1) return "Runner-up";
  if (i === 2) return "Third in sync";
  return `#${i + 1}`;
}

export default function Network() {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "empty" | "error">("idle");
  const [results, setResults] = useState<Candidate[]>([]);

  const toggle = useCallback((label: string) => {
    setSelected((cur) =>
      cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label],
    );
  }, []);

  const findPeople = useCallback(async () => {
    if (selected.length === 0) return;
    setStatus("loading");
    setResults([]);
    try {
      const r = await fetch("/api/neo4j/match-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: selected }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const data = (await r.json()) as { candidates?: Candidate[] };
      const list = Array.isArray(data.candidates) ? data.candidates : [];
      setResults(list);
      setStatus(list.length > 0 ? "done" : "empty");
    } catch {
      setStatus("error");
    }
  }, [selected]);

  const reset = useCallback(() => {
    setStatus("idle");
    setResults([]);
  }, []);

  return (
    <AppShell title="The HOMING network">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-soft)] px-3 py-1.5 text-[11.5px] text-[var(--color-sage-deep)]">
        <Wifi size={12} />
        Live · read-only · nothing you do here is saved
      </div>

      {status === "done" || status === "empty" ? (
        <Results
          results={results}
          empty={status === "empty"}
          selected={selected}
          onReset={reset}
        />
      ) : (
        <>
          <h1 className="display text-[27px] leading-tight mb-1.5">
            Who are you secretly in sync with?
          </h1>
          <p className="text-[13.5px] text-[var(--color-muted)] mb-6">
            Tap what you&apos;re into. Homi ranks the people already in the
            network you&apos;d click with — and how much.
          </p>

          <div className="flex flex-wrap gap-2 mb-7">
            {CHIPS.map((label) => {
              const on = selected.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggle(label)}
                  className="chip"
                  data-selected={on ? "true" : "false"}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <PrimaryButton
            onClick={findPeople}
            disabled={selected.length === 0 || status === "loading"}
          >
            {status === "loading" ? (
              <span className="inline-flex items-center gap-2">
                Homi is reading the flock <ThinkingDots size="small" />
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Sparkles size={16} />
                Find my people
                {selected.length > 0 && ` (${selected.length})`}
              </span>
            )}
          </PrimaryButton>

          {status === "error" && (
            <p className="text-[12.5px] text-[var(--color-clay)] text-center mt-3">
              Couldn&apos;t reach the network. Try again in a moment.
            </p>
          )}
          <p className="text-[12px] text-[var(--color-muted)] text-center mt-3">
            Pick three or four for the funniest results.
          </p>
        </>
      )}
    </AppShell>
  );
}

function Results({
  results,
  empty,
  selected,
  onReset,
}: {
  results: Candidate[];
  empty: boolean;
  selected: string[];
  onReset: () => void;
}) {
  return (
    <div className="animate-fade-in-soft">
      <h1 className="display text-[26px] leading-tight mb-1.5">
        Your people in the flock
      </h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-2">
        Based on {selected.length} interest{selected.length === 1 ? "" : "s"}:
      </p>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {selected.map((s) => (
          <Pill key={s}>{s}</Pill>
        ))}
      </div>

      {empty ? (
        <div className="card p-6 text-center mb-6">
          <p className="text-[14px] text-[var(--color-ink-soft)]">
            Nobody in the network shares those yet. The more friends sign up,
            the busier this gets — try a different mix.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 mb-6 stagger">
          {results.map((c, i) => (
            <div
              key={c.user_id}
              className={
                "card p-5 " +
                (i === 0 ? "ring-2 ring-[var(--color-sage)]" : "")
              }
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={c.first_name}
                  color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-sage-deep)] font-medium">
                    {rankLabel(i)}
                  </p>
                  <p className="display text-[18px] leading-tight">
                    {c.first_name}
                    {c.neighbourhood && (
                      <span className="text-[13px] text-[var(--color-muted)] font-normal">
                        {" "}
                        · {c.neighbourhood}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="display text-[24px] leading-none text-[var(--color-sage-deep)]">
                    {c.sync}%
                  </p>
                  <p className="text-[10px] text-[var(--color-muted)]">in sync</p>
                </div>
              </div>

              <p className="text-[13px] text-[var(--color-ink-soft)] mt-3">
                You&apos;ve got {vibe(c.sync)}
                {c.shared.length > 0 && (
                  <>
                    {" — both into "}
                    <span className="text-[var(--color-ink)]">
                      {c.shared.slice(0, 3).join(", ")}
                    </span>
                  </>
                )}
                .
              </p>

              {c.shared.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {c.shared.slice(0, 5).map((s) => (
                    <Pill key={s}>{s}</Pill>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn-secondary" onClick={onReset}>
        <RotateCcw size={15} />
        Try another mix
        <ArrowRight size={15} />
      </button>
    </div>
  );
}
