"use client";

// Demo entry. Starts a throwaway run of the entire HOMING workflow — voice,
// themes, suggestions, matching, the lot — exactly like the real product,
// except nothing is written to the graph. We pre-fill a random profile so the
// presenter can jump straight to the voice recording, and a persistent banner
// (see components/DemoBanner) keeps "nothing is saved" on screen throughout.

import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Mic, Users, EyeOff } from "lucide-react";
import { Pigeon } from "@/components/Pigeon";
import { PrimaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { enterDemoSession } from "@/lib/appMode";

const POINTS = [
  [Mic, "Record your voice", "Talk about what you're into — Homi turns it into interests."],
  [Users, "See the matching", "Walk the full flow through to who Homi would invite."],
  [EyeOff, "Nothing is saved", "A throwaway session — no account, nothing written to the network."],
] as const;

export default function DemoEntry() {
  const router = useRouter();
  const { fillSignupRandom } = useApp();

  function start() {
    enterDemoSession();
    // Pre-fill the profile gaps so the demo skips the account step and lands on
    // the voice recording. The real flow (themes → matching → …) follows.
    fillSignupRandom();
    router.push("/voice");
  }

  return (
    <div className="flex flex-col min-h-dvh px-5 pt-8 pb-7">
      <div className="flex items-center gap-2 mb-2">
        <div className="animate-float">
          <Pigeon size={84} />
        </div>
      </div>

      <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-sage-deep)] mb-3">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-sage)] animate-live-pulse" />
        Live demo
      </span>

      <h1 className="display text-[30px] leading-tight mb-2">
        See the whole HOMING flow.
      </h1>
      <p className="text-[14.5px] leading-relaxed text-[var(--color-ink-soft)] mb-7">
        Record your voice, watch Homi find your themes, and follow it all the way
        through to the matching. It&apos;s a throwaway run — nothing you do here
        is saved.
      </p>

      <div className="grid gap-3 mb-8">
        {POINTS.map(([Icon, title, body]) => (
          <div key={title} className="flex items-start gap-3">
            <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] shrink-0">
              <Icon size={16} />
            </span>
            <div>
              <p className="text-[14px] font-medium text-[var(--color-ink)]">{title}</p>
              <p className="text-[13px] text-[var(--color-muted)] leading-relaxed">
                {body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        <PrimaryButton onClick={start}>
          <span className="inline-flex items-center justify-center gap-1.5">
            <Sparkles size={16} />
            Start the demo
            <ArrowRight size={16} />
          </span>
        </PrimaryButton>
      </div>
    </div>
  );
}
