"use client";

// Presenter / dev navigator — every screen in the full flow, one tap away.
// Moved off /demo (which is now the public read-only showcase). Reach it
// directly at /map.

import Link from "next/link";
import { useApp } from "@/lib/store";
import { AppShell, Section } from "@/components/AppShell";
import { Card } from "@/components/Bits";
import { RotateCcw } from "lucide-react";

const FLOW = [
  ["/", "1 · Landing"],
  ["/how-it-works", "2 · How HOMING works"],
  ["/signup", "3 · Sign up — register"],
  ["/signup/details", "3b · Sign up — details"],
  ["/voice", "4 · Voice onboarding"],
  ["/transcribing", "5 · On-device transcription"],
  ["/themes", "6 · Main themes review"],
  ["/themes/full", "7 · Show more"],
  ["/collect/done", "7b · Collect — you're in the flock"],
  ["/suggestions", "8 · Suggested for you"],
  ["/activity/edit", "9 · Edit activity"],
  ["/activity/finding", "10 · Finding people"],
  ["/invite", "11 · Invitee card"],
  ["/invite/reschedule", "12 · Suggest another time"],
  ["/activity/verify", "13 · Verification gate"],
  ["/activity/details", "14 · Details revealed"],
  ["/chat", "15 · Group chat (ghost-host)"],
  ["/reminder", "16 · Event day reminder"],
  ["/feedback", "17 · Post-activity feedback"],
  ["/feedback/result", "18 · Feedback result"],
  ["/group", "19 · Recurring group"],
];

const META = [
  ["/demo", "★ Read-only showcase (find your people)"],
  ["/memory", "20 · Private matching memory"],
  ["/safety", "21 · Safety and support"],
  ["/privacy", "22 · Privacy by design"],
  ["/dashboard", "23 · Operator dashboard"],
  ["/metrics", "24 · Success metrics"],
];

export default function DemoMap() {
  const { resetDemo } = useApp();
  return (
    <AppShell
      back="/"
      title="Screen map"
      right={
        <button
          className="btn-ghost !text-[12px]"
          onClick={() => resetDemo()}
        >
          <RotateCcw size={12} /> Reset
        </button>
      }
    >
      <p className="text-[13.5px] text-[var(--color-muted)] mb-5">
        Every screen, in order. State is shared across screens, so you can run
        the linear flow once or jump around freely.
      </p>

      <Section title="Core flow">
        <div className="grid gap-1.5">
          {FLOW.map(([href, label]) => (
            <Link key={href} href={href}>
              <Card className="!py-3 hover:!bg-[var(--color-cream-warm)] transition-colors">
                <p className="text-[13.5px] font-medium">{label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Meta">
        <div className="grid gap-1.5">
          {META.map(([href, label]) => (
            <Link key={href} href={href}>
              <Card className="!py-3 hover:!bg-[var(--color-cream-warm)] transition-colors">
                <p className="text-[13.5px] font-medium">{label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}
