"use client";

import Link from "next/link";
import { AppShell, Section } from "@/components/AppShell";
import { Card, PrimaryButton } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";

const steps = [
  {
    n: "1",
    title: "Talk",
    body: "Record for about 30 seconds — several interests is enough.",
  },
  {
    n: "2",
    title: "Profile",
    body: "While Homi works in the background, answer a few quick questions. Your interests and similar people appear as they land.",
  },
  {
    n: "3",
    title: "Pick an activity",
    body: "Homi suggests concrete things you could do — edit any, or start one.",
  },
  {
    n: "4",
    title: "Invite",
    body: "The best-fitting people are invited first.",
  },
  {
    n: "5",
    title: "Meet",
    body: "If enough people accept, everyone verifies and the details are shared.",
  },
  {
    n: "6",
    title: "Repeat",
    body: "Afterward, private feedback helps HOMING suggest better future rounds.",
  },
];

export default function HowItWorks() {
  return (
    <AppShell back="/" title="How HOMING works">
      <Section>
        <div className="relative h-28 mb-4 grid place-items-center">
          <div className="animate-float">
            <Pigeon size={88} />
          </div>
        </div>
        <p className="text-[14px] text-[var(--color-ink-soft)] text-center px-4">
          Six small steps. Activity-first, not profile-first.
        </p>
      </Section>

      <div className="grid gap-3 mb-8 stagger">
        {steps.map((s) => (
          <Card key={s.n} className="flex items-start gap-4">
            <div className="grid place-items-center h-10 w-10 rounded-full bg-[var(--color-sand)] text-[var(--color-ink)] font-semibold text-[14px]">
              {s.n}
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-medium">{s.title}</p>
              <p className="text-[13.5px] text-[var(--color-muted)] mt-0.5">
                {s.body}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Link href="/signup">
        <PrimaryButton>Start</PrimaryButton>
      </Link>
      <Link
        href="/theory"
        className="block text-center mt-4 text-[12.5px] text-[var(--color-muted)] hover:text-[var(--color-sage-deep)]"
      >
        Curious how it works under the hood? →
      </Link>
    </AppShell>
  );
}
