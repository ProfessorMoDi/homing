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
//   • "demo"    — the read-only showcase build. Connects to whatever network
//                 the collect build has accumulated and finds connections in a
//                 throwaway session. Writes NOTHING — every Neo4j write is a
//                 no-op (see lib/neo4jClient.ts) and matching runs against the
//                 live graph via the read-only /api/neo4j/match-live route.
//
// Local override: append ?mode=collect|demo|full to any URL to flip the client
// into that mode (persisted in localStorage, mirrors lib/devMode.tsx). Lets one
// local dev server exercise all three builds without rebuilding. Server-side
// code always sees the env default — only the client honours the override.

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

// Resolve the active mode. On the client we let a ?mode= URL param (or a
// previously-stored override) win, so the same dev server can demo any build.
export function appMode(): AppMode {
  if (typeof window === "undefined") return ENV_APP_MODE;
  try {
    const param = normalize(
      new URLSearchParams(window.location.search).get(URL_PARAM),
    );
    if (param) {
      localStorage.setItem(STORAGE_KEY, param);
      return param;
    }
    const stored = normalize(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
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
