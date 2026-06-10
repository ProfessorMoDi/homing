"use client";

// Secondary entry for people who already joined. Not the main path — signup
// doesn't require verifying anything. Here we email a one-tap link; clicking it
// lands on /auth/finish and restores the session.

import { useState } from "react";
import { Mail, RotateCcw, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Label, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { useAuth } from "@/lib/auth";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Login() {
  const { ready, sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string | null>(null);

  const emailOk = EMAIL_RE.test(email);

  async function send() {
    if (!emailOk) return;
    setError(null);
    setPhase("sending");
    try {
      if (!ready) throw new Error("unconfigured");
      await sendMagicLink(email);
      setPhase("sent");
    } catch (e) {
      const code = (e as { code?: string }).code || "";
      console.error("login link failed", e);
      setError(
        code === "auth/unauthorized-continue-uri"
          ? "Sign-in links only work on the live site, not this preview address."
          : "We couldn't send the link. Check the email and try again.",
      );
      setPhase("form");
    }
  }

  if (phase === "sent") {
    return (
      <AppShell back="/login" title="Check your inbox">
        <div className="flex flex-col items-center text-center pt-8">
          <span className="grid place-items-center h-14 w-14 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] mb-4 animate-pop-check">
            <Mail size={26} />
          </span>
          <h1 className="display text-[24px] mb-2">Check your email</h1>
          <p className="text-[14px] text-[var(--color-ink-soft)] leading-relaxed max-w-[20rem]">
            We sent a one-tap sign-in link to{" "}
            <span className="font-medium text-[var(--color-ink)]">{email}</span>.
            Open it on this device to log back in.
          </p>
        </div>
        <div className="grid gap-2.5 mt-7">
          <PrimaryButton onClick={send}>
            <RotateCcw size={15} />
            Resend the link
          </PrimaryButton>
          <SecondaryButton onClick={() => setPhase("form")}>
            Use a different email
          </SecondaryButton>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back="/" title="Log in">
      <h1 className="display text-[24px] mb-1">Welcome back</h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-6">
        Enter your email and we&apos;ll send a one-tap link to sign you in.
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
            if (e.key === "Enter" && emailOk) send();
          }}
        />
      </div>

      {error && (
        <div className="card-outline p-3 mb-4 flex items-start gap-2 border-[var(--color-clay)]">
          <AlertCircle size={15} className="text-[var(--color-clay)] mt-0.5 shrink-0" />
          <p className="text-[12.5px] text-[var(--color-ink-soft)]">{error}</p>
        </div>
      )}

      <PrimaryButton onClick={send} disabled={!emailOk || phase === "sending"}>
        <Mail size={16} />
        {phase === "sending" ? "Sending link…" : "Email me a sign-in link"}
      </PrimaryButton>
    </AppShell>
  );
}
