"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, MapPin, Users, Globe, Sparkle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, Pill, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import { incomingInviteActivity } from "@/lib/matching";
import { formatDayTime, formatDuration } from "@/lib/formatActivity";

export default function InvitePage() {
  const router = useRouter();
  const a = incomingInviteActivity;
  const [status, setStatus] = useState<"open" | "in" | "no">("open");

  return (
    <AppShell back="/" title="An invitation">
      <Card className="relative overflow-hidden mb-5">
        <div className="absolute -right-4 -top-4 opacity-60">
          <Pigeon size={80} />
        </div>
        <span className="pill !bg-[var(--color-sage-soft)] !text-[var(--color-sage-deep)] !border-transparent mb-3 inline-flex">
          <Sparkle size={12} /> HOMING match
        </span>
        <p className="display text-[24px] leading-tight mb-1">
          Homi found an activity that fits you.
        </p>
        <p className="text-[13.5px] text-[var(--color-muted)]">
          Names and the exact venue are revealed only after everyone verifies.
        </p>
      </Card>

      <Card className="mb-5">
        <p className="display text-[22px] mb-1">{a.title}</p>
        <div className="grid gap-1.5 text-[13.5px] text-[var(--color-ink-soft)] mt-2">
          <span className="inline-flex items-center gap-2">
            <Clock size={14} /> {formatDayTime(a.day, a.time)} · around {formatDuration(a.duration)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Users size={14} /> {a.group_size_target} people · near campus
          </span>
          <span className="inline-flex items-center gap-2">
            <Globe size={14} /> Language: {a.language}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin size={14} /> {a.location_area}
          </span>
        </div>
      </Card>

      <Card className="mb-5">
        <p className="text-[13px] font-medium mb-2">Why this fits</p>
        <p className="text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed mb-3">
          You mentioned Ticket to Ride and casual board games.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Pill>Energy: low-pressure</Pill>
          <Pill>Structured</Pill>
          <Pill>First round only</Pill>
        </div>
      </Card>
      <Card className="mb-5 !bg-[var(--color-cream-warm)] !border-transparent">
        <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
          Another HOMING user started this. You don&apos;t see who, and they
          don&apos;t see you, until everyone verifies.
        </p>
      </Card>

      <Card className="mb-7 bg-[var(--color-cream-warm)]">
        <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
          First round only — repeat only if people want to. No profiles, no
          photos, no name reveal before verification.
        </p>
      </Card>

      {status === "open" && (
        <div className="grid gap-2.5">
          <PrimaryButton onClick={() => setStatus("in")}>
            I&apos;m interested
          </PrimaryButton>
          <SecondaryButton onClick={() => setStatus("no")}>
            Not this one
          </SecondaryButton>
          <Link href="/invite/reschedule">
            <button className="btn-ghost w-full">Suggest another time</button>
          </Link>
        </div>
      )}

      {status === "in" && (
        <Card className="!bg-[var(--color-sage-soft)] !border-transparent text-center">
          <p className="text-[14.5px] font-medium text-[var(--color-sage-deep)] mb-1">
            You&apos;re in.
          </p>
          <p className="text-[13px] text-[var(--color-sage-deep)] mb-3">
            HOMING will tell you when enough people accept. Verification is
            next.
          </p>
          <button
            className="btn-primary !py-2.5 !text-[13.5px]"
            onClick={() => router.push("/activity/verify")}
          >
            Continue
          </button>
        </Card>
      )}

      {status === "no" && (
        <Card className="text-center">
          <p className="text-[14px] font-medium mb-1">No problem.</p>
          <p className="text-[13px] text-[var(--color-muted)] mb-3">
            Not for me is okay. HOMING will keep suggesting things that fit
            better.
          </p>
          <button
            className="btn-secondary !text-[13.5px]"
            onClick={() => setStatus("open")}
          >
            Back
          </button>
        </Card>
      )}
    </AppShell>
  );
}
