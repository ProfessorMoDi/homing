"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Pigeon, PigeonMark } from "@/components/Pigeon";
import { PrimaryButton, SecondaryButton, PrivacyNote } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { appMode, ENV_APP_MODE, type AppMode } from "@/lib/appMode";

export default function Landing() {
  const router = useRouter();
  const { fillSignupRandom } = useApp();

  // Resolve the mode after mount so a ?mode= override or stored preference can
  // win without risking an SSR hydration mismatch (the server always renders
  // the env default).
  const [mode, setMode] = useState<AppMode>(ENV_APP_MODE);
  useEffect(() => setMode(appMode()), []);

  function skipSignupDemo() {
    fillSignupRandom();
    router.push("/voice?sample=1");
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="px-5 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PigeonMark size={26} />
          <span className="display text-[18px]">HOMING</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/theory"
            className="text-[12.5px] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            Under the hood
          </Link>
          {mode !== "demo" && (
            <Link
              href="/demo"
              className="text-[12.5px] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              Demo
            </Link>
          )}
        </div>
      </div>

      <div className="relative flex-1 px-5 pt-10 pb-6 flex flex-col">
        <div className="relative h-56 mb-3">
          <div className="absolute inset-0 scrim rounded-3xl opacity-90" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="animate-float">
              <Pigeon size={156} />
            </div>
          </div>
        </div>

        <p className="animate-hero-rise text-[12px] text-[var(--color-muted)] text-center mb-6 inline-flex items-center justify-center gap-1.5">
          <span className="inline-block h-1 w-1 rounded-full bg-[var(--color-sage)] animate-live-pulse" />
          {mode === "demo"
            ? "A full run-through — nothing you do is saved."
            : "Meet Homi — the pigeon who quietly carries the messages."}
        </p>

        <h1 className="animate-hero-rise delay-1 display text-[34px] leading-[1.05] text-center px-2">
          {mode === "demo"
            ? "See the whole HOMING flow."
            : "Turn what you like into a small real-life activity."}
        </h1>

        <p className="animate-hero-rise delay-2 text-[15px] leading-relaxed text-[var(--color-ink-soft)] text-center mt-4 px-2">
          {mode === "demo" ? (
            <>
              Record your voice, get matched, and follow the entire experience —
              this is a demo, so nothing you do is saved.
            </>
          ) : mode === "collect" ? (
            <>
              Talk about what you&apos;re into. We add you to the HOMING network
              so Homi can quietly connect you with people who fit.
            </>
          ) : (
            <>
              Talk about what you&apos;re into. HOMING suggests something you
              might actually want to do, then quietly invites people who fit.
            </>
          )}
        </p>

        <div className="animate-hero-rise delay-3 mt-auto pt-10 grid gap-3">
          {mode === "demo" ? (
            <>
              <Link href="/voice" className="w-full">
                <PrimaryButton>
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Sparkles size={16} />
                    Start the demo
                  </span>
                </PrimaryButton>
              </Link>
              <PrivacyNote>
                A throwaway session. Nothing you do here is written to the
                network.
              </PrivacyNote>
            </>
          ) : (
            <>
              <Link href="/signup" className="w-full">
                <PrimaryButton>Get started</PrimaryButton>
              </Link>
              <Link href="/how-it-works" className="w-full">
                <SecondaryButton>How HOMING works</SecondaryButton>
              </Link>
              <PrivacyNote>
                We turn your voice into interests, then discard the audio. No
                password — we email you a one-tap sign-in link.
              </PrivacyNote>
              {mode === "full" && (
                <div className="text-center mt-1">
                  <button
                    type="button"
                    onClick={skipSignupDemo}
                    className="text-[11.5px] text-[var(--color-muted)] hover:text-[var(--color-ink-soft)] inline-flex items-center gap-1 transition-colors"
                  >
                    Skip signup (demo with random profile)
                    <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
