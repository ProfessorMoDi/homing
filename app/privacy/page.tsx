"use client";

import { Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Bits";

const COMMITMENTS = [
  "We do not infer loneliness from municipal data.",
  "We do not classify users.",
  "We do not use social media surveillance.",
  "Your voice recording is transcribed on your phone.",
  "The recording never leaves your device.",
  "You first see only the main themes.",
  "Show more gives full transparency.",
  "You control what is used.",
  "We do not show profiles before activity acceptance and verification.",
  "We do not store ID documents or selfies.",
  "We verify age and uniqueness before meeting details are shared.",
  "Feedback about people is private.",
  "No public ratings, no popularity scores.",
  "Users can leave or delete their profile.",
];

export default function Privacy() {
  return (
    <AppShell back="/" title="Privacy by design">
      <p className="text-[13.5px] text-[var(--color-muted)] mb-5 leading-relaxed">
        The decisions we made on purpose. If any of these change, you&apos;ll
        see it here first.
      </p>

      <div className="grid gap-2.5 stagger">
        {COMMITMENTS.map((c) => (
          <Card key={c} className="flex items-start gap-3 !py-4">
            <span className="mt-0.5 grid place-items-center h-6 w-6 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
              <Check size={14} strokeWidth={3} />
            </span>
            <p className="text-[13.5px] text-[var(--color-ink)] leading-relaxed">
              {c}
            </p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
