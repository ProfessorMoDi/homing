"use client";

import { useRouter } from "next/navigation";
import { Clock, MapPin, MessageCircle, Navigation } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import { useApp } from "@/lib/store";
import { formatDayTime } from "@/lib/formatActivity";

export default function Reminder() {
  const router = useRouter();
  const { state } = useApp();
  const a = state.activity;

  return (
    <AppShell back="/chat" title="Tonight">
      <Card className="relative overflow-hidden mb-5">
        <div className="absolute -right-2 -bottom-2 opacity-60">
          <Pigeon size={72} />
        </div>
        <p className="display text-[22px] mb-1">{a.title} is tonight.</p>
        <div className="grid gap-1.5 text-[13.5px] text-[var(--color-ink-soft)] mt-2">
          <span className="inline-flex items-center gap-2">
            <Clock size={14} /> {formatDayTime(a.day, a.time)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin size={14} /> {a.exact_venue}
          </span>
        </div>
        <p className="text-[12.5px] text-[var(--color-muted)] mt-3">
          First round only. See how it feels.
        </p>
      </Card>

      <Card className="mb-7 bg-[var(--color-cream-warm)]">
        <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
          No pressure. If something comes up, just let the group know.
        </p>
      </Card>

      <div className="grid gap-2.5">
        <PrimaryButton onClick={() => router.push("/chat")}>
          <MessageCircle size={16} />
          Open chat
        </PrimaryButton>
        <SecondaryButton>
          <Navigation size={16} />
          Directions
        </SecondaryButton>
        <button
          className="btn-ghost"
          onClick={() => router.push("/feedback")}
        >
          Pretend it happened — go to feedback
        </button>
      </div>
      <p className="text-[12px] text-[var(--color-muted)] text-center mt-3">
        Demo shortcut for the hackathon flow.
      </p>
    </AppShell>
  );
}
