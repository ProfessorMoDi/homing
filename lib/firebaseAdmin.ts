// Server-only Firebase Auth admin access via Google's REST APIs — NO
// firebase-admin SDK. The SDK won't load in Vercel's serverless runtime
// (ESM/bundling), so we mint a service-account OAuth token with Node `crypto`
// and call the Identity Toolkit admin endpoints with plain `fetch`, and verify
// ID tokens against Google's public JWKS. Only Node built-ins + fetch, so
// there's no bundling/ESM surface — it runs identically locally and on Vercel.
//
// Credentials: FIREBASE_SERVICE_ACCOUNT_KEY (JSON string, prod) →
// FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS → local file.

import { readFileSync } from "node:fs";
import { createSign, createVerify } from "node:crypto";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
  private_key_id?: string;
}

const DEFAULT_KEY_FILE =
  "homing-app-40894-firebase-adminsdk-fbsvc-afe8486fad.json";

function loadServiceAccount(): ServiceAccount | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (inline) {
    try {
      return JSON.parse(inline) as ServiceAccount;
    } catch {
      console.error("[firebaseAuth] FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON");
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

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

// ── Service-account OAuth2 access token ─────────────────────────────────────
let tokenCache: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const sa = loadServiceAccount();
  if (!sa) return null;
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp - 60 > now) return tokenCache.token;

  const header = b64url(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: sa.private_key_id }),
  );
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope:
        "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  let signature: string;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    signer.end();
    signature = b64url(signer.sign(sa.private_key));
  } catch (err) {
    console.error("[firebaseAuth] failed to sign JWT", err);
    return null;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!res.ok) {
    console.error("[firebaseAuth] token exchange failed", await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return data.access_token;
}

async function adminPost(method: string, body: unknown): Promise<Response | null> {
  const token = await getAccessToken();
  const sa = loadServiceAccount();
  if (!token || !sa) return null;
  return fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/${method}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

// ── Public API (same shape the routes already use) ──────────────────────────

export async function isAdminConfigured(): Promise<boolean> {
  return loadServiceAccount() !== null;
}

interface LookupUser {
  localId: string;
  email?: string;
  displayName?: string;
}

async function lookupByEmail(email: string): Promise<LookupUser | null> {
  const res = await adminPost("accounts:lookup", { email: [email] });
  if (!res || !res.ok) return null;
  const data = (await res.json()) as { users?: LookupUser[] };
  return data.users?.[0] ?? null;
}

export async function authUserExists(email: string): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  if (!clean) return false;
  return (await lookupByEmail(clean)) !== null;
}

/** Create the Auth user if missing / refresh its display name. uid or null. */
export async function upsertAuthUser(opts: {
  email: string;
  displayName?: string;
}): Promise<string | null> {
  const email = opts.email.trim().toLowerCase();
  if (!email) return null;
  const displayName = opts.displayName?.trim() || undefined;

  const existing = await lookupByEmail(email);
  if (existing) {
    if (displayName && existing.displayName !== displayName) {
      await adminPost("accounts:update", { localId: existing.localId, displayName });
    }
    return existing.localId;
  }

  const res = await adminPost("accounts", {
    email,
    emailVerified: false,
    ...(displayName ? { displayName } : {}),
  });
  if (!res || !res.ok) {
    if (res) console.error("[firebaseAuth] create user failed", await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as { localId?: string };
  return data.localId ?? null;
}

// ── ID token verification (Google JWKS, no OAuth needed) ─────────────────────
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let certCache: { certs: Record<string, string>; exp: number } | null = null;

async function getCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.exp > Date.now()) return certCache.certs;
  const res = await fetch(CERTS_URL);
  const certs = (await res.json()) as Record<string, string>;
  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "");
  certCache = {
    certs,
    exp: Date.now() + (maxAge ? parseInt(maxAge[1], 10) * 1000 : 3600_000),
  };
  return certs;
}

export interface VerifiedToken {
  uid: string;
  email?: string;
}

/** Verify a Firebase ID token against Google's public keys. null if invalid. */
export async function verifyIdToken(token: string): Promise<VerifiedToken | null> {
  const sa = loadServiceAccount();
  if (!token || !sa) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (header.alg !== "RS256" || !header.kid) return null;

    const cert = (await getCerts())[header.kid];
    if (!cert) return null;
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    if (!verifier.verify(cert, Buffer.from(parts[2], "base64url"))) return null;

    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.exp !== "number" || payload.exp <= now ||
      payload.aud !== sa.project_id ||
      payload.iss !== `https://securetoken.google.com/${sa.project_id}` ||
      !payload.sub
    ) {
      return null;
    }
    return { uid: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
