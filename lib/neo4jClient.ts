// Client-side helpers that mirror the user's natural flow into Neo4j: every
// activity the user creates becomes a graph node, every match query runs
// against the real graph. All calls are fail-soft — if the graph is down,
// the UI never blocks, and the dev panel still shows the failed calls so
// the operator knows.
//
// Server-side routes already exist; this module is just the client
// convenience layer so transcribing/themes/etc. don't repeat the same
// fetch boilerplate.

import type { Activity } from "./types";
import { DEMO_ID } from "./currentUser";
import { writesEnabled } from "./appMode";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";

// Current user's Firebase ID token, for routes that authorize "own data only".
// Null when not signed in or Firebase isn't configured.
async function idToken(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  try {
    return (await getFirebaseAuth().currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

// Patch-style sync of signup data into Neo4j as a User node. Fail-soft.
export interface SignupSync {
  id: string;
  demo: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  age?: number | null;
  gender?: string;
  gender_preference?: string;
  postcode?: string;
  neighbourhood?: string;
  language_other?: string;
  commitment_appetite?: string;
  languages_spoken?: string[];
  languages_comfortable?: string[];
  availability?: string[];
  profile_completed?: boolean;
  share_name_with_similar?: boolean;
}

export async function syncSignup(patch: SignupSync): Promise<void> {
  if (!writesEnabled()) return;
  try {
    await fetch("/api/neo4j/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch {
    // fail-soft: dev panel surfaces the failure
  }
}

export interface VoiceSync {
  user_id: string;
  transcript: string;
  source: "live" | "sample";
  language?: string;
  language_confidence?: string;
  matching_notes?: string;
  companion_reflection?: string;
  implicit_preferences?: Array<{ phrase: string; evidence_quote?: string }>;
  languages_mentioned?: string[];
  minor_interests?: string[];
  activity_types?: string[];
  availability_hints?: string[];
  commitment_appetite?: string;
  demo: boolean;
}

export async function syncVoice(p: VoiceSync): Promise<void> {
  if (!writesEnabled()) return;
  try {
    await fetch("/api/neo4j/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {}
}

export interface InterestsSync {
  user_id: string;
  demo: boolean;
  topics: Array<{
    title: string;
    weight?: number;
    source?: "voice-analysis" | "signup" | "edited" | "seed";
    hidden?: boolean;
    tags?: string[];
    broader?: string[];
    related?: string[];
  }>;
}

export async function syncInterests(p: InterestsSync): Promise<void> {
  if (!writesEnabled()) return;
  try {
    await fetch("/api/neo4j/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {}
}

export interface InviteCreateEntry {
  user_id: string;
  match_score: number;
  match_reasons: string[];
}

export interface InvitesCreateSync {
  activity_id: string;
  invited_user_ids?: string[];
  invites?: InviteCreateEntry[];
  demo: boolean;
}

export async function syncInvitesCreate(p: InvitesCreateSync): Promise<void> {
  if (!writesEnabled()) return;
  try {
    await fetch("/api/neo4j/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {}
}

export interface InvitePatchSync {
  activity_id: string;
  invited_user_id: string;
  status: "pending" | "accepted" | "declined" | "rescheduled" | "timed_out";
  suggested_time?: string;
  demo: boolean;
}

export async function syncInvitePatch(p: InvitePatchSync): Promise<void> {
  if (!writesEnabled()) return;
  try {
    await fetch("/api/neo4j/invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {}
}

export interface VerifySync {
  user_id: string;
  activity_id?: string;
  method?: "idin" | "id_selfie" | "simulated";
  demo: boolean;
}

export async function syncVerify(p: VerifySync): Promise<void> {
  if (!writesEnabled()) return;
  try {
    await fetch("/api/neo4j/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {}
}

export interface FeedbackSync {
  user_id: string;
  activity_id: string;
  activity_rating?: number;
  event_note?: string;
  people_feedback: Record<string, "again" | "neutral" | "avoid">;
  demo: boolean;
}

export async function syncFeedback(p: FeedbackSync): Promise<void> {
  if (!writesEnabled()) return;
  try {
    await fetch("/api/neo4j/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {}
}

export interface GroupSync {
  group_id: string;
  name: string;
  theme: string;
  rhythm: string;
  born_from_activity_id: string;
  member_user_ids: string[];
  demo: boolean;
}

export async function syncGroupCreate(p: GroupSync): Promise<void> {
  if (!writesEnabled()) return;
  try {
    await fetch("/api/neo4j/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {}
}

export async function syncGroupLeave(user_id: string, group_id: string): Promise<void> {
  if (!writesEnabled()) return;
  try {
    await fetch("/api/neo4j/group", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, group_id }),
    });
  } catch {}
}

/** Candidate row returned by POST /api/neo4j/match — shared by UI and dev panel. */
export interface GraphMatchCandidate {
  user_id: string;
  first_name: string;
  neighbourhood: string;
  score: number;
  breakdown?: {
    interest: number;
  };
  paths?: Array<{
    req_id: string;
    req_title: string;
    via_id: string;
    via_title: string;
    weight: number;
    tier: "specific" | "broader";
  }>;
  reasons: string[];
  /** match-live only: 0–99 "interest sync" percentage. */
  sync?: number;
  /** match-live only: human-friendly shared-interest labels. */
  shared?: string[];
  /** match-live only: shared interests almost nobody else has. */
  rare?: string[];
}

// Returning-user reload: profile + interest titles + created activities.
// Returns null on any failure (graph down / not found) so callers can fall
// back to local state or onboarding.
export interface GraphUserData {
  exists: boolean;
  profile?: {
    first_name: string;
    last_name: string;
    gender: string;
    postcode: string;
    neighbourhood: string;
    commitment: string;
    age: number | null;
    profile_completed: boolean;
    availability: string[];
    languages_comfortable: string[];
    languages_spoken: string[];
  };
  topics?: string[];
  activities?: Activity[];
}

export async function fetchUserData(id: string): Promise<GraphUserData | null> {
  if (!id) return null;
  // The read is authorized "own data only" — attach the Firebase ID token.
  const token = await idToken();
  if (!token) return null;
  try {
    const r = await fetch(`/api/neo4j/user?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return (await r.json()) as GraphUserData;
  } catch {
    return null;
  }
}

export async function persistActivity(activity: Activity): Promise<boolean> {
  if (!writesEnabled()) return false;
  try {
    const r = await fetch("/api/neo4j/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function fetchMatchCandidates(
  activityId: string,
  creatorId: string,
): Promise<GraphMatchCandidate[] | null> {
  try {
    const r = await fetch("/api/neo4j/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId, creatorId }),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { candidates?: GraphMatchCandidate[] };
    return Array.isArray(data.candidates) ? data.candidates : [];
  } catch {
    return null;
  }
}

// Read-only matcher for the demo: rank the real signed-up network by shared
// interest, without writing an Activity node. Returns [] when nobody in the
// graph shares the interests yet (e.g. before any friends have signed up).
export async function fetchLiveMatch(
  topics: string[],
  selfId?: string,
): Promise<GraphMatchCandidate[] | null> {
  const clean = topics.filter(Boolean);
  if (clean.length === 0) return [];
  try {
    const r = await fetch("/api/neo4j/match-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics: clean, selfId }),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as {
      candidates?: Array<{
        user_id: string;
        first_name: string;
        neighbourhood: string;
        score: number;
        reasons?: string[];
        sync?: number;
        shared?: string[];
        rare?: string[];
      }>;
    };
    const list = Array.isArray(data.candidates) ? data.candidates : [];
    return list.map((c) => ({
      user_id: c.user_id,
      first_name: c.first_name,
      neighbourhood: c.neighbourhood,
      score: c.score,
      reasons: c.reasons ?? [],
      sync: typeof c.sync === "number" ? c.sync : undefined,
      shared: Array.isArray(c.shared) ? c.shared : undefined,
      rare: Array.isArray(c.rare) ? c.rare : undefined,
    }));
  } catch {
    return null;
  }
}

export async function persistAndMatch(activity: Activity): Promise<GraphMatchCandidate[] | null> {
  const ok = await persistActivity(activity);
  if (!ok) return null;

  const creatorId = activity.creator_user_id || DEMO_ID;
  const candidates = await fetchMatchCandidates(activity.id, creatorId);

  // Subgraph — drives the SVG render in the dev panel. Same fail-soft policy.
  fetch(`/api/neo4j/graph?activityId=${encodeURIComponent(activity.id)}`).catch(
    () => {},
  );

  return candidates;
}

// Fan out across the suggested set. We chain activity → match per item so
// the panel's timeline reads sequentially and the user can step through
// each one in the demo. Concurrency=1 keeps AuraDB Free's small pool happy.
export async function persistAndMatchAll(activities: Activity[]): Promise<void> {
  for (const a of activities) {
    // eslint-disable-next-line no-await-in-loop
    await persistAndMatch(a);
  }
}
