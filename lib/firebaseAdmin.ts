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
