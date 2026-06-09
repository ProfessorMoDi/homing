"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, ArrowRight, Check, AlertCircle, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Label, PrimaryButton, SecondaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function SignUp() {
  const { state, setSignup } = useApp();
  const { ready, sendMagicLink, signInWithGoogle } = useAuth();
  const router = useRouter();
  const s = state.signup;

  const [showAgeWarn, setShowAgeWarn] = useState(false);
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageNum = s.age ?? 0;
  const tooYoung = s.age !== null && ageNum > 0 && ageNum < 18;
  const tooOld = s.age !== null && ageNum > 29;
  const ageOk = ageNum >= 18 && ageNum <= 29;
  const baseOk = !!s.first_name && ageOk;
  const emailOk = EMAIL_RE.test(s.email);

  async function onMagicLink() {
    if (tooYoung || tooOld) return setShowAgeWarn(true);
    if (!baseOk || !emailOk) return;
    setError(null);
    setBusy(true);
    setPhase("sending");
    try {
      if (ready) await sendMagicLink(s.email);
      setPhase("sent");
    } catch (e) {
      console.error("magic link failed", e);
      setError("We couldn't send the link. Check the email and try again.");
      setPhase("form");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    if (tooYoung || tooOld) return setShowAgeWarn(true);
    if (!baseOk) return;
    setError(null);
    setBusy(true);
    try {
      const user = await signInWithGoogle();
      setSignup({
        email: user.email || s.email,
        first_name: s.first_name || user.displayName?.split(" ")[0] || "",
      });
      router.push("/voice");
    } catch (e) {
      const code = (e as { code?: string }).code || "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        console.error("google sign-in failed", e);
        setError("Google sign-in didn't complete. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (phase === "sent") {
    return (
      <AppShell back="/" title="Check your inbox">
        <div className="flex flex-col items-center text-center pt-8">
          <span className="grid place-items-center h-14 w-14 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] mb-4 animate-pop-check">
            <Mail size={26} />
          </span>
          <h1 className="display text-[24px] mb-2">Check your email</h1>
          <p className="text-[14px] text-[var(--color-ink-soft)] leading-relaxed max-w-[20rem]">
            We sent a one-tap sign-in link to{" "}
            <span className="font-medium text-[var(--color-ink)]">{s.email}</span>.
            Open it on this device to continue — no password needed.
          </p>
        </div>

        <div className="card-outline p-4 mt-7 text-[13px] text-[var(--color-muted)] leading-relaxed">
          Didn&apos;t get it? Check spam, or wait a moment and resend. The link
          expires after a while for your security.
        </div>

        <div className="grid gap-2.5 mt-6">
          <PrimaryButton onClick={onMagicLink} disabled={busy}>
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
    <AppShell back="/" title="Create your account">
      <div className="mb-5">
        <p className="text-[12px] text-[var(--color-muted)] text-center">
          No password — we&apos;ll email you a one-tap sign-in link
        </p>
      </div>

      <h1 className="display text-[24px] mb-1">Join HOMING</h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-6">
        For young adults, 18–29.
      </p>

      <div className="grid gap-3 mb-5">
        <div>
          <Label>Email</Label>
          <input
            className="field"
            placeholder="you@email.com"
            value={s.email}
            inputMode="email"
            autoComplete="email"
            onChange={(e) => setSignup({ email: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <input
              className="field"
              placeholder="Maxine"
              value={s.first_name}
              onChange={(e) => setSignup({ first_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Age</Label>
            <input
              inputMode="numeric"
              className="field"
              placeholder="23"
              value={s.age ?? ""}
              onChange={(e) =>
                setSignup({ age: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
        </div>
        {showAgeWarn && (tooYoung || tooOld) && (
          <div className="card-outline p-3 text-[13px] text-[var(--color-ink-soft)] border-[var(--color-clay)]">
            HOMING is currently piloting for 18–29 only. A younger track would
            need separate safeguarding.
          </div>
        )}
        {error && (
          <div className="card-outline p-3 flex items-start gap-2 border-[var(--color-clay)]">
            <AlertCircle size={15} className="text-[var(--color-clay)] mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-[var(--color-ink-soft)]">{error}</p>
          </div>
        )}
      </div>

      <PrimaryButton onClick={onMagicLink} disabled={!baseOk || !emailOk || busy}>
        <Mail size={16} />
        {phase === "sending" ? "Sending link…" : "Email me a sign-in link"}
      </PrimaryButton>

      <div className="flex items-center gap-3 my-4">
        <span className="h-px flex-1 bg-[var(--color-line)]" />
        <span className="text-[12px] text-[var(--color-muted)]">or</span>
        <span className="h-px flex-1 bg-[var(--color-line)]" />
      </div>

      <button
        type="button"
        className="btn-secondary"
        onClick={onGoogle}
        disabled={!baseOk || busy}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="text-[12px] text-[var(--color-muted)] text-center mt-4 inline-flex items-center justify-center gap-1.5 w-full">
        <Check size={13} className="text-[var(--color-sage-deep)]" />
        Your email is only used to sign you in and connect your activities.
      </p>
    </AppShell>
  );
}
