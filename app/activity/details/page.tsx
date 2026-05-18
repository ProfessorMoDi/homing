"use client";

import { useRouter } from "next/navigation";
import { Clock, MapPin, Users, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Avatar, Pill, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { findUser } from "@/lib/data";

const PARTICIPANTS = ["u_franz", "u_lena", "u_sophie"];

export default function ActivityDetails() {
  const { state } = useApp();
  const router = useRouter();
  const a = state.activity;
  const participants = ["You", ...PARTICIPANTS.map((id) => findUser(id)?.first_name || "—")];

  return (
    <AppShell back="/activity/verify" title="Activity details">
      <Card className="mb-5">
        <span className="pill !bg-[var(--color-sage-soft)] !text-[var(--color-sage-deep)] !border-transparent mb-2 inline-flex">
          Confirmed
        </span>
        <p className="display text-[24px] leading-tight mb-1">{a.title}</p>
        <div className="grid gap-1.5 text-[13.5px] text-[var(--color-ink-soft)] mt-2">
          <span className="inline-flex items-center gap-2">
            <Clock size={14} /> {a.day} {a.time} · {a.duration}
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
          One game of Catan.
        </p>
        <p className="text-[13px] font-medium mb-1">Why</p>
        <p className="text-[13.5px] text-[var(--color-ink-soft)] mb-3">
          Everyone matched strongly on Catan, board games, or strategy games.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Pill>Catan</Pill>
          <Pill>Strategy</Pill>
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
