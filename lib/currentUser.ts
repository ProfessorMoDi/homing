// Single source of truth for the active user id used in every /api/neo4j/*
// call. Two modes:
//
//   • Live  — once /signup has captured a real email, the id is `u_<slug>`
//             derived from the email's local part. Falls back to a
//             generated "anon" id during a partial signup.
//   • Demo  — always `u_demo`. Detected via the `?sample=1` URL flag, a
//             previously-loaded sample voice, or simply the absence of a
//             real email in signup.
//
// We tag every node/edge that originates from a demo run with `demo: true`
// so it can be wiped via the "Clear demo data" dev-panel action without
// touching seeded or real data.

const DEMO_USER_ID = "u_demo";

export interface UserContext {
  id: string;
  demo: boolean;
}

export interface SignupSnapshot {
  first_name?: string;
  email?: string;
}

// Pure resolver — given the current signup state and an optional URL hint,
// return the user context that all syncs should use. No window access here
// so this can also run in tests / SSR.
export function resolveUserContext(
  signup: SignupSnapshot | undefined,
  opts: { sampleFlag?: boolean } = {},
): UserContext {
  if (opts.sampleFlag) return { id: DEMO_USER_ID, demo: true };

  const email = signup?.email?.trim().toLowerCase() ?? "";
  if (!email) return { id: DEMO_USER_ID, demo: true };

  return { id: `u_${slug(email.split("@")[0])}`, demo: false };
}

// Client-side helper that also peeks at the URL/localStorage for the sample
// hint. Use inside React components — wraps resolveUserContext.
export function currentUserContext(signup?: SignupSnapshot): UserContext {
  if (typeof window === "undefined") return resolveUserContext(signup);
  let sampleFlag = false;
  try {
    sampleFlag = new URLSearchParams(window.location.search).has("sample");
  } catch {}
  return resolveUserContext(signup, { sampleFlag });
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "anon";
}

export const DEMO_ID = DEMO_USER_ID;
