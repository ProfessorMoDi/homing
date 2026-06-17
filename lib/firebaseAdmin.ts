// Server-only Firebase Admin access. NEVER import from client code — it holds
// a private key.
//
// firebase-admin is loaded with a DYNAMIC import() rather than a static one.
// Next compiles a static `import` in a route into CommonJS `require()`, and
// firebase-admin (v14) resolves to ESM on Vercel's serverless runtime, so
// `require()` of it throws "require() of ES Module" and crashes the whole
// route module (a hard 500 on every request, even ones that don't use admin).
// A dynamic import() uses the ESM loader and is wrapped in try/catch, so the
// SDK loads when possible and degrades to "not configured" when it can't —
// it never takes the route down.
//
// Credentials: FIREBASE_SERVICE_ACCOUNT_KEY (JSON string, used in prod) →
// FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS → a local key
// file. No credential → admin features no-op (fail closed for reads).

import { readFileSync } from "node:fs";
import type { ServiceAccount } from "firebase-admin/app";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";

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

let authPromise: Promise<Auth | null> | undefined;

function getAdminAuth(): Promise<Auth | null> {
  if (authPromise !== undefined) return authPromise;
  authPromise = (async () => {
    try {
      const { cert, getApps, initializeApp } = await import("firebase-admin/app");
      const { getAuth } = await import("firebase-admin/auth");
      const existing = getApps();
      const app = existing.length
        ? existing[0]
        : (() => {
            const credential = loadServiceAccount();
            return credential ? initializeApp({ credential: cert(credential) }) : null;
          })();
      return app ? getAuth(app) : null;
    } catch (err) {
      console.error("[firebaseAdmin] admin SDK unavailable", err);
      return null;
    }
  })();
  return authPromise;
}

export async function isAdminConfigured(): Promise<boolean> {
  return (await getAdminAuth()) !== null;
}

/** Verify a Firebase ID token. null if invalid / expired / admin unavailable. */
export async function verifyIdToken(token: string): Promise<DecodedIdToken | null> {
  const auth = await getAdminAuth();
  if (!auth || !token) return null;
  try {
    return await auth.verifyIdToken(token);
  } catch {
    return null;
  }
}

/** Authoritative existence check via the Admin SDK. false when unavailable. */
export async function authUserExists(email: string): Promise<boolean> {
  const auth = await getAdminAuth();
  if (!auth || !email) return false;
  try {
    await auth.getUserByEmail(email.trim().toLowerCase());
    return true;
  } catch {
    return false;
  }
}

/** Create the Auth user if missing / refresh its display name. uid or null. */
export async function upsertAuthUser(opts: {
  email: string;
  displayName?: string;
}): Promise<string | null> {
  const auth = await getAdminAuth();
  if (!auth) return null;
  const email = opts.email.trim().toLowerCase();
  if (!email) return null;
  const displayName = opts.displayName?.trim() || undefined;
  try {
    const existing = await auth.getUserByEmail(email);
    if (displayName && existing.displayName !== displayName) {
      await auth.updateUser(existing.uid, { displayName });
    }
    return existing.uid;
  } catch {
    try {
      const created = await auth.createUser({
        email,
        emailVerified: false,
        ...(displayName ? { displayName } : {}),
      });
      return created.uid;
    } catch (err) {
      try {
        return (await auth.getUserByEmail(email)).uid;
      } catch {
        console.error("[firebaseAdmin] upsertAuthUser failed", err);
        return null;
      }
    }
  }
}
