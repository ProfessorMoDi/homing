"use client";

import { Users, Calendar, Sparkle, LogOut, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Avatar, Pill, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";

function activityNoun(title: string): string {
  const cleaned = title
    .replace(/^(start a |start the |try a |try the |begin a |begin the |a |the )/i, "")
    .trim();
  return cleaned || "this activity";
}

function groupTitle(title: string): string {
  const noun = activityNoun(title);
  // Capitalize first letter for display
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

function rhythmFromDay(day: string): string {
  const lower = day.toLowerCase();
  if (lower.includes("mon")) return "Every second Monday";
  if (lower.includes("tue")) return "Every second Tuesday";
  if (lower.includes("wed")) return "Every second Wednesday";
  if (lower.includes("thu")) return "Every second Thursday";
  if (lower.includes("fri")) return "Every second Friday";
  if (lower.includes("sat")) return "Every other Saturday";
  if (lower.includes("sun")) return "Every other Sunday";
  return "Once every couple of weeks";
}

export default function RecurringGroup() {
  const { state, acceptedInvitees } = useApp();
  const a = state.activity;
  const members = [
    "You",
    ...acceptedInvitees.map((u) => u.first_name || "HOMING member"),
  ];
  const tags = [
    ...a.specific_interest_tags,
    ...a.broader_interest_tags,
  ].slice(0, 4);

  return (
    <AppShell back="/feedback/result" title="Recurring group">
      <Card className="mb-5">
        <span className="pill !bg-[var(--color-sage-soft)] !text-[var(--color-sage-deep)] !border-transparent inline-flex mb-3">
          <Sparkle size={12} /> Group suggested
        </span>
        <p className="display text-[24px] mb-1">{groupTitle(a.title)}</p>
        <div className="grid gap-1.5 text-[13.5px] text-[var(--color-ink-soft)] mt-2">
          <span className="inline-flex items-center gap-2">
            <Users size={14} /> {members.length} people
          </span>
          <span className="inline-flex items-center gap-2">
            <Calendar size={14} /> {rhythmFromDay(a.day)}
          </span>
        </div>
      </Card>

      <Card className="mb-5">
        <p className="text-[13px] font-medium mb-3">Members</p>
        <div className="flex flex-wrap gap-2">
          {members.map((n, i) => (
            <div
              key={n}
              className="inline-flex items-center gap-2 pr-3 pl-1 py-1 rounded-full bg-[var(--color-cream-warm)]"
            >
              <Avatar
                name={n}
                color={(["sage", "clay", "sky", "sand"] as const)[i % 4]}
              />
              <span className="text-[13.5px]">{n}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <p className="text-[13px] font-medium mb-1">Next idea</p>
        <p className="text-[13.5px] text-[var(--color-ink-soft)] mb-3">
          {a.title} again — or something similar.
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        )}
      </Card>

      <Card className="mb-7 !bg-[var(--color-cream-warm)] !border-transparent">
        <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
          A good outcome is that the app becomes less central. If you start
          your own WhatsApp, that&apos;s a win.
        </p>
      </Card>

      <div className="grid gap-2.5">
        <PrimaryButton>Plan next round</PrimaryButton>
        <SecondaryButton>
          <Sparkle size={14} /> Let HOMING suggest next
        </SecondaryButton>
        <SecondaryButton>
          <UserPlus size={14} /> Invite replacement
        </SecondaryButton>
        <button className="btn-ghost text-[var(--color-clay)]">
          <LogOut size={14} /> Leave group
        </button>
      </div>
    </AppShell>
  );
}
