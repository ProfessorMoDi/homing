"use client";

// Landing page for the magic-link email. Firebase appends the sign-in code to
// the URL; we complete the sign-in here, attach the verified email to the
// user's profile, and send them on into onboarding (or straight to "you're in"
// if they've already completed it on this device).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton, Label } from "@/components/Bits";
import { SoftSpinner } from "@/components/Loading";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { resolveUserContext } from "@/lib/currentUser";

type Phase = "working" | "need-email" | "error";

export default function AuthFinish() {
  const router = useRouter();
  const { state, setSignup, hydrateFromGraph } = useApp();
  const { ready, isMagicLinkUrl, completeMagicLink } = useAuth();
  const [phase, setPhase] = useState<Phase>("working");
  const [email, setEmail] = useState("");
  const ran = useRef(false);

  // Hybrid returning-user routing: prefer this browser's local session, else
  // reload the account from Neo4j. Either way a known user lands on the events
  // page (/suggestions) and never re-onboards. Only a genuinely new account
  // (no local data, nothing in the graph) goes to /voice.
  async function onSignedIn(verifiedEmail: string) {
    setSignup({ email: verifiedEmail });
    if (state.topics.length > 0) {
      router.replace("/suggestions");
      return;
    }
    const id = resolveUserContext({ email: verifiedEmail }).id;
    const loaded = await hydrateFromGraph(id);
    router.replace(loaded ? "/suggestions" : "/voice");
  }

  async function finish(emailOverride?: string) {
    try {
      const verified = await completeMagicLink(emailOverride);
      await onSignedIn(verified);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "MISSING_EMAIL") {
        setPhase("need-email");
      } else {
        console.error("magic link completion failed", e);
        setPhase("error");
      }
    }
  }

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!ready || !isMagicLinkUrl()) {
      setPhase("error");
      return;
    }
    void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (phase === "working") {
    return (
      <AppShell noTopBar>
        <div className="flex flex-col items-center justify-center min-h-[70dvh] gap-5">
          <SoftSpinner size={32} className="text-[var(--color-sage-deep)]" />
          <p className="text-[14px] text-[var(--color-muted)]">Signing you in…</p>
        </div>
      </AppShell>
    );
  }

  if (phase === "need-email") {
    return (
      <AppShell back="/signup" title="Confirm your email">
        <h1 className="display text-[23px] mb-1.5">One quick check</h1>
        <p className="text-[13.5px] text-[var(--color-muted)] mb-5">
          For your security, confirm the email this link was sent to.
        </p>
        <div className="mb-5">
          <Label>Email</Label>
          <input
            className="field"
            placeholder="you@email.com"
            value={email}
            inputMode="email"
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim()) finish(email);
            }}
          />
        </div>
        <PrimaryButton onClick={() => finish(email)} disabled={!email.trim()}>
          <span className="inline-flex items-center justify-center gap-1.5">
            Continue <ArrowRight size={16} />
          </span>
        </PrimaryButton>
      </AppShell>
    );
  }

  return (
    <AppShell back="/signup" title="Sign-in link">
      <div className="flex flex-col items-center text-center pt-10">
        <span className="grid place-items-center h-14 w-14 rounded-full bg-[var(--color-clay-soft)] text-[#7d4730] mb-4">
          <AlertCircle size={26} />
        </span>
        <h1 className="display text-[23px] mb-1.5">This link didn&apos;t work</h1>
        <p className="text-[14px] text-[var(--color-ink-soft)] leading-relaxed max-w-[20rem]">
          It may have expired or already been used. Sign-in links are single-use
          — request a fresh one to continue.
        </p>
      </div>
      <div className="mt-7">
        <PrimaryButton onClick={() => router.push("/signup")}>
          Back to sign in
        </PrimaryButton>
      </div>
    </AppShell>
  );
}
