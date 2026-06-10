// App-mode turns one codebase into three products that share one Neo4j graph.
// The build-time default comes from NEXT_PUBLIC_APP_MODE; demo is a runtime
// session that can be entered from any build.
//
//   • "collect" — the data-collection build you send to friends. Truncated flow
//                 (signup → voice → interests → "you're in"). Writes REAL users
//                 into the shared graph. Set NEXT_PUBLIC_APP_MODE=collect.
//
//   • "demo"    — the FULL workflow as a throwaway: voice → themes →
//                 suggestions → matching → verify → chat → feedback → group,
//                 exactly like the real product, except nothing is written to
//                 the graph (every Neo4j write is a no-op — see lib/neo4jClient).
//                 Entered via /demo; persists for the browser tab (sessionStorage)
//                 so the whole flow stays in demo until you exit.
//
//   • "full"    — the same complete flow as demo but WITH writes. The default
//                 for local dev / the original hackathon demo.
//
// Precedence (client): ?mode= override > active demo session > stored override
// > env default. Server-side always sees the env default.

export type AppMode = "full" | "collect" | "demo";

const STORAGE_KEY = "homing-app-mode"; // persisted collect|full override (localStorage)
const DEMO_SESSION_KEY = "homing-demo-session"; // active demo run (sessionStorage)
const URL_PARAM = "mode";

function normalize(v: string | null | undefined): AppMode | null {
  if (v === "full" || v === "collect" || v === "demo") return v;
  return null;
}

// The build-time default baked in from the environment. Falls back to "full"
// so an unconfigured deployment behaves like the original demo.
export const ENV_APP_MODE: AppMode =
  normalize(process.env.NEXT_PUBLIC_APP_MODE) ?? "full";

function demoSessionActive(): boolean {
  try {
    return window.sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

// Start a throwaway demo run. Persists for the tab so every screen of the flow
// stays in demo (and therefore never writes to the graph).
export function enterDemoSession(): void {
  try {
    window.sessionStorage.setItem(DEMO_SESSION_KEY, "1");
  } catch {}
}

export function exitDemoSession(): void {
  try {
    window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {}
}

export function appMode(): AppMode {
  if (typeof window === "undefined") return ENV_APP_MODE;
  try {
    const param = normalize(
      new URLSearchParams(window.location.search).get(URL_PARAM),
    );
    if (param === "demo") {
      enterDemoSession();
      return "demo";
    }
    if (param) {
      // Explicit collect|full override — persist and leave any demo session.
      window.localStorage.setItem(STORAGE_KEY, param);
      exitDemoSession();
      return param;
    }
    if (demoSessionActive()) return "demo";
    const stored = normalize(window.localStorage.getItem(STORAGE_KEY));
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

// True for the builds that run the complete product flow (full + demo) — i.e.
// everything except the truncated collect build. Use this for flow branching
// (show suggestions, the matching/activity screens, the skip shortcuts).
export function runsFullFlow(): boolean {
  return appMode() !== "collect";
}

// Demo is the only mode that must never mutate the shared graph.
export function writesEnabled(): boolean {
  return appMode() !== "demo";
}
