"use client";

import { useRouter } from "next/navigation";
import { Clock, MapPin, Users, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Avatar, Pill, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { formatDayTime, formatDuration } from "@/lib/formatActivity";

function buildWhyLine(tags: string[]): string {
  const top = tags.filter(Boolean).slice(0, 3);
  if (top.length === 0) {
    return "Everyone in the group matched on what you said you wanted to do.";
  }
  if (top.length === 1) {
    return `Everyone matched strongly on ${top[0]}.`;
  }
  if (top.length === 2) {
    return `Everyone matched strongly on ${top[0]} or ${top[1]}.`;
  }
  return `Everyone matched strongly on ${top[0]}, ${top[1]}, or ${top[2]}.`;
}

export default function ActivityDetails() {
  const { state, acceptedInvitees } = useApp();
  const router = useRouter();
  const a = state.activity;
  const participants = ["You", ...acceptedInvitees.map((u) => u.first_name)];
  const allTags = [
    ...(a.specific_interest_tags ?? []),
    ...(a.broader_interest_tags ?? []),
  ];
  const whyLine = buildWhyLine(allTags);
  const summaryLine = a.description || a.note || a.title;
  const pillTags = allTags.slice(0, 2);

  return (
    <AppShell back="/activity/verify" title="Activity details">
      <Card className="mb-5">
        <span className="pill !bg-[var(--color-sage-soft)] !text-[var(--color-sage-deep)] !border-transparent mb-2 inline-flex">
          Confirmed
        </span>
        <p className="display text-[24px] leading-tight mb-1">{a.title}</p>
        <div className="grid gap-1.5 text-[13.5px] text-[var(--color-ink-soft)] mt-2">
          <span className="inline-flex items-center gap-2">
            <Clock size={14} /> {formatDayTime(a.day, a.time)} · {formatDuration(a.duration)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin size={14} /> {a.exact_venue}
          </span>
          <span className="inline-flex items-center gap-2">
            <Users size={14} /> {participants.length} verified
          </span>
        </div>
      </Card>

      <Card className="mb-5">
        <p className="text-[13px] font-medium mb-3">Participants</p>
        <div className="flex flex-wrap gap-2">
          {participants.map((name, i) => (
            <div
              key={name + i}
              className="inline-flex items-center gap-2 pr-3 pl-1 py-1 rounded-full bg-[var(--color-cream-warm)]"
            >
              <Avatar
                name={name}
                color={(["sage", "clay", "sky", "sand"] as const)[i % 4]}
              />
              <span className="text-[13.5px]">{name}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <p className="text-[13px] font-medium mb-1">Suggested first activity</p>
        <p className="text-[13.5px] text-[var(--color-ink-soft)] mb-3">
          {summaryLine}
        </p>
        <p className="text-[13px] font-medium mb-1">Why</p>
        <p className="text-[13.5px] text-[var(--color-ink-soft)] mb-3">
          {whyLine}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {pillTags.map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
          <Pill>{a.language}</Pill>
        </div>
      </Card>

      <Card className="mb-7 bg-[var(--color-cream-warm)]">
        <p className="text-[13px] font-medium mb-1">Light guidance</p>
        <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
          Keep it simple: one game, one drink, no pressure to stay longer.
        </p>
      </Card>

      <div className="grid gap-2.5">
        <PrimaryButton onClick={() => router.push("/chat")}>
          <MessageCircle size={16} />
          Open group chat
        </PrimaryButton>
        <SecondaryButton onClick={() => router.push("/reminder")}>
          See reminder preview
        </SecondaryButton>
        <button className="btn-ghost">I can&apos;t make it</button>
      </div>
    </AppShell>
  );
}
