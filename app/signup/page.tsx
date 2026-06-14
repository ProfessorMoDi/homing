"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Label, PrimaryButton } from "@/components/Bits";
import { useApp } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { exitDemoSession } from "@/lib/appMode";
import { resolveUserContext } from "@/lib/currentUser";
import { RETURNING_EMAIL_KEY, SIGNUP_LINK_SENT_KEY } from "@/lib/signupFlow";

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

function magicLinkErrorMessage(e: unknown, authReady: boolean): string {
  const code = (e as { code?: string }).code || "";
  if (code === "auth/unauthorized-continue-uri") {
    return "This URL isn't authorized in Firebase yet. Use the production site, or add this domain under Firebase → Authentication → Settings → Authorized domains.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Email link sign-in isn't enabled. In Firebase Console → Authentication → Sign-in method, turn on Email/Password and Email link (passwordless).";
  }
  if (code === "auth/configuration-not-found") {
    return "Firebase Authentication isn't enabled for this project yet. Open Firebase Console → Authentication → Get started.";
  }
  if (!authReady) {
    return "Sign-in isn't configured on this deployment (missing NEXT_PUBLIC_FIREBASE_* env vars).";
  }
  return "We couldn't send your sign-in link. Check the email and try again.";
}

export default function SignUp() {
  const { state, setSignup, commitSignup, hydrateFromGraph } = useApp();
  const { ready, sendMagicLink, emailHasAccount, signInWithGoogle } = useAuth();
  const router = useRouter();
  const s = state.signup;

  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseOk = !!s.first_name;
  const emailOk = EMAIL_RE.test(s.email);

  async function onStart() {
    if (!baseOk || !emailOk || sending) return;
    if (!ready) {
      setError(
        "Sign-in links aren't available here — Firebase env vars are missing. Use production or configure NEXT_PUBLIC_FIREBASE_*.",
      );
      return;
    }
    setError(null);
    setSending(true);
    setBusy(true);
    // If this email already has an account, don't start a second onboarding —
    // send them to sign in instead. (No-op when Firebase can't tell, e.g.
    // email enumeration protection — then it falls through to normal signup.)
    if (await emailHasAccount(s.email)) {
      try {
        sessionStorage.setItem(RETURNING_EMAIL_KEY, s.email.trim().toLowerCase());
      } catch {
        /* private mode */
      }
      router.push("/login");
      return;
    }
    exitDemoSession();
    commitSignup();
    try {
      await sendMagicLink(s.email);
      try {
        sessionStorage.setItem(SIGNUP_LINK_SENT_KEY, s.email);
      } catch {
        /* private mode */
      }
      router.push("/voice");
    } catch (e) {
      console.error("signup link failed", e);
      setError(magicLinkErrorMessage(e, ready));
      setSending(false);
      setBusy(false);
    }
  }

  async function onGoogle() {
    if (!baseOk) return;
    setError(null);
    setBusy(true);
    exitDemoSession();
    try {
      const user = await signInWithGoogle();
      const email = user.email || s.email;
      setSignup({
        email,
        first_name: s.first_name || user.displayName?.split(" ")[0] || "",
      });
      // Returning Google account → skip onboarding, open the events page.
      // Prefer local session, else reload from the graph.
      if (state.topics.length > 0) {
        router.push("/suggestions");
        return;
      }
      const loaded = await hydrateFromGraph(resolveUserContext({ email }).id);
      if (loaded) {
        router.push("/suggestions");
        return;
      }
      commitSignup();
      router.push("/voice");
    } catch (e) {
      const code = (e as { code?: string }).code || "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        console.error("google sign-in failed", e);
        setError("Google sign-in didn't complete. Please try again.");
      }
      setBusy(false);
    }
  }

  return (
    <AppShell back="/" title="Create your account">
      <div className="mb-5">
        <p className="text-[12px] text-[var(--color-muted)] text-center">
          No password — we&apos;ll email you a link so you can sign back in later
        </p>
      </div>

      <h1 className="display text-[24px] mb-1">Join HOMING</h1>
      <p className="text-[13.5px] text-[var(--color-muted)] mb-6">
        Just a few basics to get started.
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
        {!ready && (
          <div className="card-outline p-3 flex items-start gap-2 border-[var(--color-clay)]">
            <AlertCircle size={15} className="text-[var(--color-clay)] mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-[var(--color-ink-soft)]">
              Sign-in links aren&apos;t available here — Firebase env vars are
              missing (common on Vercel Preview). Use production or set{" "}
              <code className="text-[11px]">NEXT_PUBLIC_FIREBASE_*</code> locally.
            </p>
          </div>
        )}
        {error && (
          <div className="card-outline p-3 flex items-start gap-2 border-[var(--color-clay)]">
            <AlertCircle size={15} className="text-[var(--color-clay)] mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-[var(--color-ink-soft)]">{error}</p>
          </div>
        )}
      </div>

      <PrimaryButton
        onClick={onStart}
        disabled={!baseOk || !emailOk || busy || !ready}
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          {sending ? "Sending link…" : "Start"}
          <ArrowRight size={16} />
        </span>
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

      <p className="text-[12.5px] text-[var(--color-muted)] text-center mt-5">
        Already joined?{" "}
        <Link href="/login" className="text-[var(--color-sage-deep)] underline underline-offset-2">
          Log in
        </Link>
      </p>
    </AppShell>
  );
}
