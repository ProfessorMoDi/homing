"use client";

// Terminal screen for the collect build. The user has signed up, recorded
// their voice, confirmed their interests, and filled the quick profile — all
// of it is now in the shared graph. There is no matching or activity flow in
// this build; the whole point was to add one more real person to the network.

import { useCallback, useState } from "react";
import { Check, Share2, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Pill, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import { useApp } from "@/lib/store";

export default function CollectDone() {
  const { state, resetDemo } = useApp();
  const [copied, setCopied] = useState(false);

  const topics = state.topics.filter((t) => !t.hidden).slice(0, 8);
  const name = state.signup.first_name?.trim();

  const share = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const text =
      "Add yourself to the HOMING flock — talk about what you're into and join the network 🕊️";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "HOMING", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user dismissed the share sheet — nothing to do */
    }
  }, []);

  return (
    <AppShell noTopBar>
      <div className="flex flex-col items-center text-center pt-10 px-1">
        <div className="relative mb-6">
          <div className="animate-float">
            <Pigeon size={120} />
          </div>
          <span className="absolute -bottom-1 -right-1 grid place-items-center h-9 w-9 rounded-full bg-[var(--color-sage)] text-white animate-pop-check shadow">
            <Check size={18} strokeWidth={3} />
          </span>
        </div>

        <h1 className="display text-[30px] leading-tight mb-2">
          {name ? `You're in the flock, ${name}` : "You're in the flock"}
        </h1>
        <p className="text-[14px] text-[var(--color-ink-soft)] leading-relaxed max-w-[20rem]">
          Everything you shared is now part of the HOMING network. Homi will
          carry the message when there&apos;s someone you should meet.
        </p>
      </div>

      {topics.length > 0 && (
        <div className="card-outline p-4 mt-7">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-sage-deep)] font-medium mb-3">
            What we&apos;re remembering for you
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <Pill key={t.id}>{t.title}</Pill>
            ))}
          </div>
        </div>
      )}

      <div className="mt-7 grid gap-3">
        <PrimaryButton onClick={share}>
          <span className="inline-flex items-center justify-center gap-2">
            <Share2 size={16} />
            {copied ? "Link copied!" : "Invite a friend to the flock"}
          </span>
        </PrimaryButton>
        <SecondaryButton onClick={resetDemo}>
          <RotateCcw size={15} />
          Add someone else
        </SecondaryButton>
      </div>

      <p className="text-[12px] text-[var(--color-muted)] text-center mt-5 leading-relaxed">
        We never store your recording — only the interests you confirmed.
      </p>
    </AppShell>
  );
}
