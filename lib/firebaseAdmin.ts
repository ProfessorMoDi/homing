// Server-only Firebase Admin singleton — used to verify Firebase ID tokens so
// API routes can prove who is calling before returning or mutating a user's
// personal data. NEVER import this from client code; it holds a private key.
//
// Credential resolution (first hit wins):
//   1. FIREBASE_SERVICE_ACCOUNT_KEY — the service-account JSON as a string.
//      This is what production (Vercel) should use; the JSON file is gitignored
//      and never deployed.
//   2. FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS — a path
//      to the JSON file (handy for local dev).
//   3. The default local filename in the project root (dev convenience).
//
// If no credential is found, isAdminConfigured() is false and verifyIdToken()
// returns null — protected routes then fail closed (reject), so a missing key
// degrades to "no access", never to "open access".

import { readFileSync } from "node:fs";
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

const DEFAULT_KEY_FILE =
  "homing-app-40894-firebase-adminsdk-fbsvc-afe8486fad.json";

function loadServiceAccount(): ServiceAccount | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (inline) {
    try {
      return JSON.parse(inline) as ServiceAccount;
    } catch {
      console.error("[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON");
      return null;
    }
  }
  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    DEFAULT_KEY_FILE;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ServiceAccount;
  } catch {
    return null;
  }
}

let cached: App | null | undefined;

function adminApp(): App | null {
  if (cached !== undefined) return cached;
  if (getApps().length > 0) {
    cached = getApps()[0];
    return cached;
  }
  const credential = loadServiceAccount();
  if (!credential) {
    cached = null;
    return cached;
  }
  cached = initializeApp({ credential: cert(credential) });
  return cached;
}

export function isAdminConfigured(): boolean {
  return adminApp() !== null;
}

/** Verify a Firebase ID token. Returns the decoded token, or null if invalid
 *  / expired / admin not configured. Never throws. */
export async function verifyIdToken(
  token: string,
): Promise<DecodedIdToken | null> {
  const app = adminApp();
  if (!app || !token) return null;
  try {
    return await getAuth(app).verifyIdToken(token);
  } catch {
    return null;
  }
}

/** Authoritative "does this email have an account?" via the Admin SDK — works
 *  even with email enumeration protection on (unlike the client method).
 *  Returns false when admin isn't configured (caller treats as "unknown"). */
export async function authUserExists(email: string): Promise<boolean> {
  const app = adminApp();
  if (!app || !email) return false;
  try {
    await getAuth(app).getUserByEmail(email.trim().toLowerCase());
    return true;
  } catch {
    return false; // user-not-found (or error) → treat as not existing
  }
}

/** Create the Firebase Auth user if missing, or refresh its display name, so a
 *  signup writes a real account immediately — independent of whether the magic
 *  link email is ever delivered/clicked. Returns the uid, or null if admin
 *  isn't configured. Never throws. */
export async function upsertAuthUser(opts: {
  email: string;
  displayName?: string;
}): Promise<string | null> {
  const app = adminApp();
  if (!app) return null;
  const email = opts.email.trim().toLowerCase();
  if (!email) return null;
  const displayName = opts.displayName?.trim() || undefined;
  const auth = getAuth(app);
  try {
    const existing = await auth.getUserByEmail(email);
    if (displayName && existing.displayName !== displayName) {
      await auth.updateUser(existing.uid, { displayName });
    }
    return existing.uid;
  } catch {
    // Not found (or transient) — try to create.
    try {
      const created = await auth.createUser({
        email,
        emailVerified: false,
        ...(displayName ? { displayName } : {}),
      });
      return created.uid;
    } catch (err) {
      // e.g. a race created it between get and create — fall back to a lookup.
      try {
        return (await auth.getUserByEmail(email)).uid;
      } catch {
        console.error("[firebaseAdmin] upsertAuthUser failed", err);
        return null;
      }
    }
  }
}
