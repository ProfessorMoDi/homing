"use client";

import { Phone, Stethoscope, Flag, Ban } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Bits";

const RESOURCES = [
  {
    name: "113 Zelfmoordpreventie",
    detail: "24/7, free, confidential. Call 113 or 0800-0113.",
    icon: <Phone size={16} />,
    color: "clay",
  },
  {
    name: "EUR Student Wellbeing",
    detail: "Counsellors and walk-in support during the week.",
    icon: <Stethoscope size={16} />,
    color: "sage",
  },
  {
    name: "Contact your GP",
    detail: "For ongoing or non-urgent support.",
    icon: <Stethoscope size={16} />,
    color: "sky",
  },
  {
    name: "Emergency services",
    detail: "Call 112 if you or someone else is in immediate danger.",
    icon: <Phone size={16} />,
    color: "clay",
  },
] as const;

const TONE_BG: Record<string, string> = {
  clay: "bg-[var(--color-clay-soft)] text-[#7d4730]",
  sage: "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]",
  sky: "bg-[var(--color-sky-soft)] text-[#3b5a73]",
};

export default function Safety() {
  return (
    <AppShell back="/" title="Need to talk to someone today?">
      <p className="text-[13.5px] text-[var(--color-muted)] mb-5 leading-relaxed">
        HOMING is a community connection tool, not mental health support. If
        you need to talk to someone, here are people trained for that.
      </p>

      <div className="grid gap-3 mb-7">
        {RESOURCES.map((r) => (
          <Card key={r.name} className="flex items-start gap-3">
            <span
              className={
                "grid place-items-center h-9 w-9 rounded-full " +
                TONE_BG[r.color]
              }
            >
              {r.icon}
            </span>
            <div>
              <p className="text-[14.5px] font-medium">{r.name}</p>
              <p className="text-[13px] text-[var(--color-muted)] mt-0.5">
                {r.detail}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-3 !bg-[var(--color-cream-warm)] !border-transparent">
        <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
          HOMING does not alert the university, municipality, or any external
          party based on what you say or do. These resources are shown to
          <span className="font-medium"> you </span>only.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button className="btn-secondary !text-[13px]">
          <Flag size={14} /> Report someone
        </button>
        <button className="btn-secondary !text-[13px]">
          <Ban size={14} /> Block someone
        </button>
      </div>
    </AppShell>
  );
}
