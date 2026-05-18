"use client";

import { Check, X } from "lucide-react";
import { AppShell, Section } from "@/components/AppShell";
import { Card } from "@/components/Bits";

const OPTIMIZE = [
  "Real-world activity formation",
  "Repeated meetings",
  "Positive mutual feedback",
  "Recurring groups",
  "User-reported sense of belonging",
  "Opt-in anonymous UCLA-3 style sampling at 3 and 6 months",
  "Qualitative interviews",
];

const REJECT = [
  "Screen time",
  "Surveillance",
  "Maximizing matches",
  "Public popularity",
];

export default function Metrics() {
  return (
    <AppShell back="/" title="Success metrics">
      <p className="text-[13.5px] text-[var(--color-muted)] mb-6 leading-relaxed">
        HOMING succeeds when users need the app less because their real-world
        rhythm continues. These are the things we measure — and the things we
        deliberately don&apos;t.
      </p>

      <Section title="We optimize for">
        <div className="grid gap-2">
          {OPTIMIZE.map((o) => (
            <Card key={o} className="flex items-start gap-3 !py-3.5">
              <span className="mt-0.5 grid place-items-center h-6 w-6 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
                <Check size={14} strokeWidth={3} />
              </span>
              <p className="text-[13.5px]">{o}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="We do not optimize for">
        <div className="grid gap-2">
          {REJECT.map((r) => (
            <Card key={r} className="flex items-start gap-3 !py-3.5">
              <span className="mt-0.5 grid place-items-center h-6 w-6 rounded-full bg-[var(--color-clay-soft)] text-[#7d4730]">
                <X size={14} strokeWidth={3} />
              </span>
              <p className="text-[13.5px]">{r}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Card className="!bg-[var(--color-cream-warm)] !border-transparent">
        <p className="display text-[18px] mb-1">The success picture</p>
        <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
          A group forms a WhatsApp chat. They keep meeting without HOMING. They
          stop opening the app for months. That&apos;s success.
        </p>
      </Card>
    </AppShell>
  );
}
