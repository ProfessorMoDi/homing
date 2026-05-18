"use client";

import { TrendingUp, Users, Activity, Repeat, ShieldCheck, QrCode } from "lucide-react";
import { AppShell, Section } from "@/components/AppShell";
import { Card } from "@/components/Bits";

const METRICS = [
  { label: "Active users", value: "1,284", trend: "+18% MoM" },
  { label: "Completed voice profiles", value: "942" },
  { label: "Activities suggested", value: "3,127" },
  { label: "Activities started by users", value: "612" },
  { label: "Invitations sent", value: "2,388" },
  { label: "Invitation acceptance rate", value: "61%" },
  { label: "Activities confirmed", value: "402" },
  { label: "Verification completion rate", value: "94%" },
  { label: "Activities completed", value: "366" },
  { label: "Repeat activity rate", value: "37%" },
  { label: "Recurring groups formed", value: "58" },
  { label: "Groups still active after 4 weeks", value: "41" },
  { label: "Opt-in wellbeing survey response", value: "29%" },
];

const SNIPPETS = [
  "Honestly the Catan night made my week.",
  "I liked that I didn't have to plan it.",
  "Verification before details made it feel safer.",
];

export default function OperatorDashboard() {
  return (
    <AppShell back="/" title="Operator dashboard">
      <p className="text-[13.5px] text-[var(--color-muted)] mb-5 leading-relaxed">
        Aggregate metrics for the EUR pilot. No individual transcripts, no
        personal feedback, no scoring of users.
      </p>

      <Section title="At a glance">
        <div className="grid grid-cols-2 gap-2.5">
          {METRICS.slice(0, 6).map((m) => (
            <Card key={m.label} className="!p-4">
              <p className="text-[12px] text-[var(--color-muted)]">{m.label}</p>
              <p className="display text-[22px] mt-1">{m.value}</p>
              {m.trend && (
                <p className="text-[11.5px] text-[var(--color-sage-deep)] mt-1 inline-flex items-center gap-1">
                  <TrendingUp size={11} /> {m.trend}
                </p>
              )}
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Pipeline">
        <Card>
          <div className="grid gap-2">
            {METRICS.slice(6).map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="text-[var(--color-ink-soft)]">{m.label}</span>
                <span className="font-medium tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Anonymous qualitative snippets">
        <div className="grid gap-2">
          {SNIPPETS.map((s) => (
            <Card key={s} className="!py-3 !bg-[var(--color-cream-warm)] !border-transparent">
              <p className="text-[13px] text-[var(--color-ink-soft)] italic">
                &ldquo;{s}&rdquo;
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        title="Phase 2 referral rails"
        subtitle="Trusted partners refer; residents choose."
      >
        <Card className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sand)] text-[#6a5326]">
            <QrCode size={16} />
          </span>
          <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
            Trusted partners such as GPs or student wellbeing staff can refer a
            young adult into HOMING by giving them a QR code or link. The
            resident still chooses whether to join. No one is added
            automatically.
          </p>
        </Card>
      </Section>

      <Section title="Not visible here">
        <Card className="!bg-[var(--color-cream-warm)] !border-transparent">
          <ul className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed grid gap-1">
            <li>· Individual transcripts</li>
            <li>· Personal feedback</li>
            <li>· Loneliness scores</li>
            <li>· Mental health labels</li>
            <li>· Private avoid-pairing preferences</li>
          </ul>
        </Card>
      </Section>
    </AppShell>
  );
}
