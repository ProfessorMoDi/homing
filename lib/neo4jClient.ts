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
