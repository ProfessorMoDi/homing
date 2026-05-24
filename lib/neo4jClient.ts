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

// Patch-style sync of signup data into Neo4j as a User node. Fail-soft.
export interface SignupSync {
  id: string;
  demo: boolean;
  first_name?: string;
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
}

export async function syncSignup(patch: SignupSync): Promise<void> {
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
  demo: boolean;
}

export async function syncVoice(p: VoiceSync): Promise<void> {
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
  }>;
}

export async function syncInterests(p: InterestsSync): Promise<void> {
  try {
    await fetch("/api/neo4j/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {}
}

export interface InvitesCreateSync {
  activity_id: string;
  invited_user_ids: string[];
  demo: boolean;
}

export async function syncInvitesCreate(p: InvitesCreateSync): Promise<void> {
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
  try {
    await fetch("/api/neo4j/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {}
}

export async function syncGroupLeave(user_id: string, group_id: string): Promise<void> {
  try {
    await fetch("/api/neo4j/group", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, group_id }),
    });
  } catch {}
}

export async function persistAndMatch(activity: Activity): Promise<void> {
  try {
    const r = await fetch("/api/neo4j/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    });
    if (!r.ok) return; // Stop the chain — match will error against a missing activity.
  } catch {
    return;
  }

  // Match — runs independently. Errors are surfaced in the dev panel; we
  // don't await its completion to keep the UX snappy.
  fetch("/api/neo4j/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activityId: activity.id,
      creatorId: activity.creator_user_id || DEMO_ID,
    }),
  }).catch(() => {});

  // Subgraph — drives the SVG render in the dev panel. Same fail-soft policy.
  fetch(`/api/neo4j/graph?activityId=${encodeURIComponent(activity.id)}`).catch(() => {});
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
