"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Clock, MapPin, Users, ChevronRight, Mail, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Pill, GhostButton } from "@/components/Bits";
import {
  defaultCatanActivity,
  photoWalkActivity,
  musicActivity,
  incomingInviteActivity,
} from "@/lib/matching";
import type { Activity } from "@/lib/types";
import { useApp } from "@/lib/store";
import { formatDayTime, formatDuration } from "@/lib/formatActivity";

const fallbackCards: Activity[] = [
  defaultCatanActivity,
  photoWalkActivity,
  musicActivity,
];

const fallbackReasons: Record<string, string> = {
  a_catan_thu: "You talked about Catan and low-pressure board games.",
  a_photo_sat: "You mentioned film photography and exploring Rotterdam.",
  a_music_fri:
    "You mentioned making techno and wanting to learn with others.",
};

export default function Suggestions() {
  const router = useRouter();
  const { state, setActivity, markActivityForSync } = useApp();

  const aiCards = state.suggestedActivities ?? [];
  const cards = aiCards.length > 0 ? aiCards : fallbackCards;
  const isAi = aiCards.length > 0;

  // Warm the edit route so picking a card transitions instantly.
  useEffect(() => {
    router.prefetch("/activity/edit");
  }, [router]);

  function reasonFor(a: Activity): string {
    if (isAi) return a.note || a.description || "";
    return fallbackReasons[a.id] ?? "";
  }

  function start(a: Activity) {
    setActivity(a);
    // Pre-warm the graph so the Activity node exists before the edit page
    // debounced sync and the eventual match run.
    markActivityForSync(a.id);
    router.push("/activity/edit");
  }

  return (
    <AppShell back="/signup/details" title="Suggested for you">
      <h1 className="display text-[28px] leading-tight mb-1">
        Suggested for you
      </h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-3">
        Small activities based on what you actually talked about.
      </p>
      {isAi && (
        <p className="text-[12px] text-[var(--color-sage-deep)] inline-flex items-center gap-1.5 mb-5">
          <Sparkles size={12} /> Generated from your voice profile
        </p>
      )}

      <Link href="/invite" className="block mb-5">
        <Card className="relative !p-0 overflow-hidden hover:translate-y-[-1px] transition-transform">
          <div className="flex items-stretch">
            <div className="w-1.5 bg-[var(--color-sage)]" />
            <div className="flex-1 py-4 pl-4 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="grid place-items-center h-7 w-7 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
                  <Mail size={14} />
                </span>
                <p className="text-[11.5px] uppercase tracking-wider text-[var(--color-sage-deep)] font-medium">
                  Invitation arrived
                </p>
                <span className="relative inline-flex h-2 w-2 ml-auto mr-1">
                  <span className="absolute inset-0 rounded-full bg-[var(--color-sage)] animate-ping" />
                  <span className="relative h-2 w-2 rounded-full bg-[var(--color-sage)]" />
                </span>
              </div>
              <p className="display text-[17px] leading-snug mb-1">
                {incomingInviteActivity.title}
              </p>
              <p className="text-[12.5px] text-[var(--color-ink-soft)]">
                {formatDayTime(incomingInviteActivity.day, incomingInviteActivity.time)} · {incomingInviteActivity.group_size_target} people · {incomingInviteActivity.location_area}
              </p>
              <p className="text-[12px] text-[var(--color-muted)] mt-1.5">
                Another HOMING user started this — tap to see how it looks from the other side.
              </p>
            </div>
            <div className="grid place-items-center pr-4 text-[var(--color-muted)]">
              <ChevronRight size={18} />
            </div>
          </div>
        </Card>
      </Link>

      <div className="grid gap-4 stagger">
        {cards.map((a) => (
          <Card key={a.id} interactive>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="display text-[19px] leading-tight">{a.title}</p>
              <span className="pill !bg-[var(--color-sage-soft)] !text-[var(--color-sage-deep)] !border-transparent">
                fits you
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-[var(--color-ink-soft)] mb-3">
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> {formatDayTime(a.day, a.time)} · {formatDuration(a.duration)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> {a.group_size_target} people
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {a.location_area}
              </span>
            </div>
            <p className="text-[13px] text-[var(--color-muted)] leading-relaxed mb-4">
              {reasonFor(a)}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[...a.specific_interest_tags, ...a.broader_interest_tags]
                .slice(0, 4)
                .map((t) => (
                  <Pill key={t}>{t}</Pill>
                ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => start(a)}
                className="btn-primary !py-2.5 !text-[13.5px] flex-1"
              >
                Start this
              </button>
              <button
                onClick={() => start(a)}
                className="btn-secondary !py-2.5 !text-[13.5px] !w-auto px-4"
              >
                Edit
              </button>
              <button
                onClick={() => router.back()}
                className="btn-ghost !text-[13.5px]"
              >
                Not now
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center mt-7">
        <GhostButton>See more suggestions</GhostButton>
      </div>
    </AppShell>
  );
}
