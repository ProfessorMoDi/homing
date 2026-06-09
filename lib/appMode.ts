// App-mode is the single switch that turns one codebase into three distinct
// products. It is read from NEXT_PUBLIC_APP_MODE at build time so each Vercel
// deployment can be a different mode while sharing one Neo4j database:
//
//   • "full"    — the complete hackathon demo flow (signup → voice → themes →
//                 suggestions → match → verify → chat → feedback → group).
//                 This is the default; nothing changes for the existing demo.
//
//   • "collect" — the data-collection build. The link you send to friends.
//                 Truncates the flow at signup → voice → interests, then stops
//                 on a "you're in" screen. Writes REAL (non-demo) users, voice
//                 profiles, and LIKES edges into the shared graph so the
//                 network fills up with real people.
//
//   • "demo"    — the read-only showcase. Lives entirely under the /demo path.
//                 Connects to whatever network the collect build has
//                 accumulated and finds connections in a throwaway session.
//                 Writes NOTHING — every Neo4j write is a no-op (see
//                 lib/neo4jClient.ts) and matching runs against the live graph
//                 via the read-only /api/neo4j/match-live route.
//
// Single deployment, path-driven: the whole site runs the env default (set
// NEXT_PUBLIC_APP_MODE=collect for the build you send to friends), and visiting
// /demo flips into the read-only showcase for that page. So "normal site =
// collect, /demo = demo" from one Vercel project sharing one graph.
//
// Local override: append ?mode=collect|full to any URL to force that mode on
// the client (persisted in localStorage, mirrors lib/devMode.tsx) so one dev
// server can exercise every build. Server-side code always sees the env
// default — only the client honours the path/override.

export type AppMode = "full" | "collect" | "demo";

const STORAGE_KEY = "homing-app-mode";
const URL_PARAM = "mode";

function normalize(v: string | null | undefined): AppMode | null {
  if (v === "full" || v === "collect" || v === "demo") return v;
  return null;
}

// The build-time default baked in from the environment. Falls back to "full"
// so an unconfigured deployment behaves exactly like the original demo.
export const ENV_APP_MODE: AppMode =
  normalize(process.env.NEXT_PUBLIC_APP_MODE) ?? "full";

// Path prefixes that are always the read-only demo, regardless of env. The
// showcase lives under /demo so "the normal site" and "/demo" can coexist in
// one deployment.
const DEMO_PATHS = ["/demo"];

function isDemoPath(pathname: string): boolean {
  return DEMO_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Resolve the active mode (client-side). Precedence:
//   1. /demo path  → demo (never persisted; purely scoped to that page)
//   2. ?mode= param → collect|full override for local testing (persisted)
//   3. stored override from a previous ?mode=
//   4. env default (NEXT_PUBLIC_APP_MODE)
export function appMode(): AppMode {
  if (typeof window === "undefined") return ENV_APP_MODE;
  try {
    if (isDemoPath(window.location.pathname)) return "demo";

    const param = normalize(
      new URLSearchParams(window.location.search).get(URL_PARAM),
    );
    // Only persist non-demo overrides — demo is path-scoped, so a stale stored
    // "demo" must never bleed into the collect flow.
    if (param && param !== "demo") {
      localStorage.setItem(STORAGE_KEY, param);
      return param;
    }
    const stored = normalize(localStorage.getItem(STORAGE_KEY));
    if (stored && stored !== "demo") return stored;
  } catch {}
  return ENV_APP_MODE;
}

export function isFull(): boolean {
  return appMode() === "full";
}
export function isCollect(): boolean {
  return appMode() === "collect";
}
export function isDemo(): boolean {
  return appMode() === "demo";
}

// Demo is the only mode that must never mutate the shared graph.
export function writesEnabled(): boolean {
  return appMode() !== "demo";
}
