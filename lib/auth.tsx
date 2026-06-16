"use client";

// Passwordless auth for the collect/normal build. Two ways in, both verify the
// email so a signup is a real, re-loginnable account connected to the user's
// Neo4j identity (u_<email-slug>):
//
//   • Magic link — enter email, Firebase mails a one-tap sign-in link, the
//     /auth/finish route completes it. No password ever; re-login = new link.
//   • Google     — one-tap popup, email already verified by Google.
//
// Everything degrades gracefully if Firebase isn't configured: the provider
// still mounts, `ready` is false, and the UI can fall back without crashing.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";

const EMAIL_KEY = "homing-auth-email";

interface AuthCtx {
  user: User | null;
  /** false until the first auth-state check resolves (or Firebase is unconfigured). */
  loading: boolean;
  /** true when Firebase config is present and auth can be used. */
  ready: boolean;
  /** Email the magic link was last sent to (for the "check your inbox" screen). */
  pendingEmail: string | null;
  sendMagicLink: (email: string) => Promise<void>;
  /**
   * True when the email already has a Firebase account. Checked server-side via
   * the Admin SDK, so it's reliable even with email enumeration protection on.
   * Returns false when it can't tell (admin unconfigured / error) — callers
   * treat false as "proceed", never a hard "definitely new".
   */
  emailHasAccount: (email: string) => Promise<boolean>;
  /**
   * Create the Firebase Auth user (with display name) up front, so a signup
   * writes a real account immediately instead of only when the magic link is
   * clicked. No-op if the Admin SDK isn't configured. Never throws.
   */
  registerAccount: (email: string, firstName?: string) => Promise<void>;
  /** Completes a magic-link sign-in from the current URL. Returns the email. */
  completeMagicLink: (emailOverride?: string) => Promise<string>;
  isMagicLinkUrl: () => boolean;
  signInWithGoogle: () => Promise<User>;
  signOutUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function actionCodeSettings() {
  return {
    url: `${window.location.origin}/auth/finish`,
    handleCodeInApp: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const ready = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(ready);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, [ready]);

  const sendMagicLink = useCallback(async (email: string) => {
    const clean = email.trim().toLowerCase();
    await sendSignInLinkToEmail(getFirebaseAuth(), clean, actionCodeSettings());
    try {
      window.localStorage.setItem(EMAIL_KEY, clean);
    } catch {}
    setPendingEmail(clean);
  }, []);

  const emailHasAccount = useCallback(
    async (email: string): Promise<boolean> => {
      const clean = email.trim().toLowerCase();
      if (!clean) return false;
      try {
        const r = await fetch(
          `/api/auth/account?email=${encodeURIComponent(clean)}`,
        );
        if (!r.ok) return false;
        const data = (await r.json()) as { exists?: boolean; configured?: boolean };
        return data.configured === true && data.exists === true;
      } catch {
        return false;
      }
    },
    [],
  );

  const registerAccount = useCallback(
    async (email: string, firstName?: string): Promise<void> => {
      const clean = email.trim().toLowerCase();
      if (!clean) return;
      try {
        await fetch("/api/auth/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: clean, first_name: firstName }),
        });
      } catch {
        // fail-soft: magic link still creates the account on click
      }
    },
    [],
  );

  const isMagicLinkUrl = useCallback(() => {
    if (!ready) return false;
    try {
      return isSignInWithEmailLink(getFirebaseAuth(), window.location.href);
    } catch {
      return false;
    }
  }, [ready]);

  const completeMagicLink = useCallback(async (emailOverride?: string) => {
    const auth = getFirebaseAuth();
    let email = emailOverride?.trim().toLowerCase() || "";
    if (!email) {
      try {
        email = window.localStorage.getItem(EMAIL_KEY) || "";
      } catch {}
    }
    if (!email) throw new Error("MISSING_EMAIL");
    const cred = await signInWithEmailLink(auth, email, window.location.href);
    try {
      window.localStorage.removeItem(EMAIL_KEY);
    } catch {}
    return cred.user.email || email;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(getFirebaseAuth(), provider);
    return cred.user;
  }, []);

  const signOutUser = useCallback(async () => {
    if (!ready) return;
    await signOut(getFirebaseAuth());
  }, [ready]);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        ready,
        pendingEmail,
        sendMagicLink,
        emailHasAccount,
        registerAccount,
        completeMagicLink,
        isMagicLinkUrl,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
