"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Pencil, X, RotateCcw, Sparkles, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, PrimaryButton, SecondaryButton, Pill } from "@/components/Bits";
import { ThinkingDots } from "@/components/Loading";
import { useApp } from "@/lib/store";
import {
  getOrFetchSuggestions,
  hasCached,
  topicSignature,
  type RawSuggestedActivity,
} from "@/lib/suggestionsCache";

type RegenStatus = "idle" | "loading" | "ready" | "error";

export default function Themes() {
  const {
    state,
    updateTopic,
    removeTopic,
    loadSampleVoice,
    setSuggestedActivities,
  } = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [regen, setRegen] = useState<RegenStatus>("idle");
  const lastSig = useRef<string | null>(null);

  // Background regeneration of activity suggestions, keyed on a topic
  // signature. The module-level cache survives navigation and React Strict
  // Mode's double mount, so going back and forth never re-fires the request.
  useEffect(() => {
    const visibleTopics = state.topics
      .filter((t) => !t.hidden)
      .map((t) => ({
        title: t.title,
        explanation: t.explanation,
        tags: t.tags,
      }));

    if (visibleTopics.length === 0) return;

    const sig = topicSignature(visibleTopics);
    if (lastSig.current === sig) return; // no meaningful change since last run
    lastSig.current = sig;

    // Cache hit — show ready immediately, nothing to do.
    if (hasCached(sig)) {
      setRegen("ready");
      return;
    }

    let cancelled = false;
    setRegen("loading");

    getOrFetchSuggestions(sig, async () => {
      const r = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: visibleTopics,
          languages: state.signup.languages_comfortable,
          availability_hints: state.signup.availability,
          minor_interests: state.minorInterests,
        }),
      });
      if (!r.ok) throw new Error(`Suggest failed (${r.status})`);
      const data = (await r.json()) as { activities?: RawSuggestedActivity[] };
      const list = Array.isArray(data.activities) ? data.activities : [];
      if (list.length === 0) {
        throw new Error("Empty activities");
      }
      return list;
    })
      .then((activities) => {
        if (cancelled) return;
        setSuggestedActivities(activities);
        setRegen("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn("Background suggest failed", err);
        setRegen("error");
      });

    return () => {
      cancelled = true;
    };
  }, [
    state.topics,
    state.signup.languages_comfortable,
    state.signup.availability,
    state.minorInterests,
    setSuggestedActivities,
  ]);

  if (state.topics.length === 0) {
    return (
      <AppShell back="/transcribing" title="Main themes">
        <div className="card p-6 text-center">
          <p className="text-[14px] text-[var(--color-ink-soft)] mb-4">
            Nothing to review yet. Load a sample to continue the demo.
          </p>
          <SecondaryButton onClick={loadSampleVoice}>
            Load sample
          </SecondaryButton>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back="/transcribing" title="Main themes">
      <h1 className="display text-[26px] mb-1">Main themes Homi heard</h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-5">
        Just the big ones. You can edit, remove, or open everything else below.
      </p>

      <div className="grid gap-3 mb-5 stagger">
        {state.topics.map((t) => (
          <Card key={t.id} className="relative">
            {editing === t.id ? (
              <div className="grid gap-3">
                <input
                  className="field"
                  value={t.title}
                  onChange={(e) =>
                    updateTopic(t.id, { title: e.target.value })
                  }
                />
                <textarea
                  className="field min-h-20"
                  value={t.explanation}
                  onChange={(e) =>
                    updateTopic(t.id, { explanation: e.target.value })
                  }
                />
                <div className="flex gap-2">
                  <button
                    className="btn-ghost"
                    onClick={() => setEditing(null)}
                  >
                    Done
                  </button>
                  <button
                    className="btn-ghost text-[var(--color-clay)]"
                    onClick={() => {
                      removeTopic(t.id);
                      setEditing(null);
                    }}
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="display text-[18px] mb-1">{t.title}</p>
                    <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
                      {t.explanation}
                    </p>
                  </div>
                  <button
                    aria-label="Edit"
                    className="btn-ghost shrink-0"
                    onClick={() => setEditing(t.id)}
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {t.tags.slice(0, 3).map((tag) => (
                    <Pill key={tag}>{tag}</Pill>
                  ))}
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      <Link href="/themes/full" className="block">
        <SecondaryButton>Show more</SecondaryButton>
      </Link>

      <div className="divider" />

      <RegenBadge status={regen} />

      <PrimaryButton onClick={() => router.push("/suggestions")}>
        Looks right
      </PrimaryButton>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          className="btn-secondary"
          onClick={() => router.push("/voice")}
        >
          <RotateCcw size={14} /> Record again
        </button>
        <Link href="/themes/full">
          <SecondaryButton>Edit details</SecondaryButton>
        </Link>
      </div>
    </AppShell>
  );
}

function RegenBadge({ status }: { status: RegenStatus }) {
  if (status === "idle") return null;
  return (
    <div className="mb-3 flex items-center justify-center">
      <span
        className={
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] transition-colors " +
          (status === "loading"
            ? "bg-[var(--color-cream-warm)] text-[var(--color-ink-soft)]"
            : status === "ready"
              ? "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]"
              : "bg-[var(--color-cream-warm)] text-[var(--color-muted)]")
        }
      >
        {status === "loading" && (
          <>
            <Sparkles size={12} />
            Homi is drafting 3 things you could actually do
            <ThinkingDots size="small" />
          </>
        )}
        {status === "ready" && (
          <>
            <Check size={12} strokeWidth={3} />
            Homi has 3 fresh suggestions ready
          </>
        )}
        {status === "error" && (
          <>
            <Sparkles size={12} />
            Using your earlier suggestions
          </>
        )}
      </span>
    </div>
  );
}
