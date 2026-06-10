// Shared knowledge: what the pipeline stages are, how to map an event URL
// to a stage, and the educational copy used by the narrative + per-call
// explainers. Keeping it in one module so the strip and the detail view
// always agree.

import type { DevEvent } from "../../lib/devBus";

export type StageId =
  | "signup"
  | "transcribe"
  | "analyse"
  | "interests"
  | "voice"
  | "suggest"
  | "persist"
  | "match"
  | "invites"
  | "verify"
  | "feedback"
  | "group"
  | "visualise"
  | "graph-write"
  | "other";

export interface Stage {
  id: StageId;
  name: string;
  short: string;          // one-liner used in tooltips
  what: string;           // 1–3 sentences shown when stage is expanded
  steps: string[];        // step-by-step breakdown shown under the narrative
}

export const STAGES: Stage[] = [
  {
    id: "signup",
    name: "Signup",
    short: "Identity → User node",
    what: "As you fill in signup fields, a User node is upserted in Neo4j. Patch-style: only the fields you've typed land in the graph, debounced 600ms so the User node trails your input.",
    steps: [
      "Each setSignup() call queues a sync; the store debounces 600ms after you stop typing.",
      "POST /api/neo4j/user with the diff. Server runs canonicalizeNeighbourhood on the postcode → neighbourhood mapping.",
      "Replaces AVAILABLE_AT / SPEAKS / COMFORTABLE_IN edges when those arrays are provided.",
      "Demo flag is sticky — once written as demo:true it stays true.",
    ],
  },
  {
    id: "transcribe",
    name: "Transcribe",
    short: "Voice → text",
    what: "Your recording is uploaded to ElevenLabs' Scribe v1 model, which returns a verbatim transcript and an inferred language code.",
    steps: [
      "Browser packages the audio blob as multipart/form-data.",
      "POST /api/transcribe forwards it to ElevenLabs with our API key.",
      "Server returns { text, language } — text only, no diarisation.",
    ],
  },
  {
    id: "voice",
    name: "Voice Profile",
    short: "Transcript → VoiceProfile node",
    what: "The transcript itself is persisted as a VoiceProfile node attached to the User via :RECORDED. 1:1 — re-recording replaces the prior profile rather than accumulating.",
    steps: [
      "POST /api/neo4j/voice with { user_id, transcript, source: live|sample, language }.",
      "Server deletes the prior VoiceProfile (if any) and creates a fresh one.",
      "The RECORDED edge timestamp records when this voice landed.",
    ],
  },
  {
    id: "interests",
    name: "Interests",
    short: "Topics → User LIKES edges",
    what: "The 3–8 main topics the analysis extracted become LIKES edges from the User to the canonical Topic nodes. Edits in /themes flow through the same endpoint; hiding sets weight=0; removing deletes the edge.",
    steps: [
      "POST /api/neo4j/interests with the full topic set (server bulk-replaces).",
      "Server canonicalizeTopic on every title — 'board game' collapses to 'board-games'.",
      "Each LIKES edge gets a source property (voice-analysis / edited / signup) so we can tell where it came from.",
      "Topics already in the ontology auto-inherit RELATED_TO edges; new ones land as canonical:false until added to the taxonomy.",
    ],
  },
  {
    id: "analyse",
    name: "Analyse",
    short: "Text → topics + suggestions",
    what: "The transcript goes to gpt-oss:120b on Ollama with a strict JSON system prompt. The model returns canonical topics, minor interests, comfortable languages, activity-type descriptors, and 3 grounded activity suggestions.",
    steps: [
      "POST /api/analyze with { transcript, demoMode }.",
      "System prompt instructs the model: one atomic concept per topic, never invent interests.",
      "Response is coerced to a typed Analysis object (8 topics max, 4 activities max).",
      "The store turns each suggested activity into an Activity with a unique id.",
    ],
  },
  {
    id: "suggest",
    name: "Suggest",
    short: "Topics → fresh suggestions",
    what: "When the user edits their topics, /api/suggest regenerates exactly 3 activity ideas from the updated topic set (cached on a signature so we don't re-hit the LLM).",
    steps: [
      "Topic set is hashed into a signature key.",
      "Cache hit → activities returned synchronously, no LLM call.",
      "Cache miss → POST /api/suggest with { topics, languages, availability_hints, minor_interests }.",
      "Same JSON-only system prompt as /analyze, just for the activities array.",
    ],
  },
  {
    id: "persist",
    name: "Persist",
    short: "Activity → graph node",
    what: "Each generated activity is upserted into Neo4j as an :Activity node, its REQUIRES edges to canonical Topic ids rebuilt, and its SCHEDULED_AT TimeSlot computed from day + time. Free-text tags ('board game') are collapsed to canonical ids ('board-games') before the write — see the canonicalisation trace.",
    steps: [
      "POST /api/neo4j/activity with the full Activity payload.",
      "Server runs canonicalizeTopic on every tag — alias map collapses singular/plural variants.",
      "Server runs canonicalizeNeighbourhood on location_area — 'Near EUR campus' → 'Kralingen'.",
      "Cypher MERGEs the Activity, deletes old REQUIRES, creates fresh ones tied to canonical Topics.",
      "Response returns { ok, canonicalised: { topics, neighbourhood } } so the panel can show what was rewritten.",
    ],
  },
  {
    id: "match",
    name: "Match",
    short: "Graph → candidates",
    what: "The match query traverses the activity's REQUIRES edges, expands them by 1 hop along RELATED_TO, intersects with user :LIKES (weight > 0 — hidden topics excluded), and ranks candidates by interest overlap only. The same response drives /activity/finding and simulateInvites; the dev panel shows the identical breakdown.",
    steps: [
      "POST /api/neo4j/match with { activityId, creatorId } — awaited in persistAndMatch(), not fire-and-forget.",
      "Cypher: MATCH (a)-[:REQUIRES]->(t)-[:RELATED_TO*0..1]-(t2)<-[l:LIKES]-(u) WHERE coalesce(l.weight,1) > 0. Direct hit gets weight 1.0; 1-hop hit gets the edge's weight (0.6 broader / 0.5 sibling / 0.3 adjacent).",
      "Per (user, requirement) we take max(weight) so direct + indirect matches don't double-count.",
      "Sum: specific × 50 + broader × 30, each scaled by weight. Total score = interest score only.",
      "AVOID edges and DISLIKES of any required specific topic exclude candidates entirely.",
      "Top 20 returned with paths array — what topic via what topic — and a reasons array like 'Likes Casual games (related to Board games)'.",
    ],
  },
  {
    id: "invites",
    name: "Invites",
    short: "Activity → INVITED → User",
    what: "When you tap 'Ask' on an activity, the top candidates from the match get INVITED edges with status='pending'. Demo accepts simulate the next state transition; each accept/decline patches the edge in place.",
    steps: [
      "POST /api/neo4j/invites with { activity_id, invited_user_ids[] } to bulk-create the pending edges.",
      "PATCH /api/neo4j/invites for each individual response — status flips to accepted/declined/rescheduled with responded_at.",
      "AuraDB Free pool is small, so we serialise the patches rather than firing in parallel.",
    ],
  },
  {
    id: "verify",
    name: "Verify",
    short: "User → VERIFIED_VIA → Activity",
    what: "Identity verification flips User.verification_status to 'verified' and creates a VERIFIED_VIA edge to the activity that gated the verification. We track method (iDIN / id-selfie / simulated) so the dev panel can show which path was taken.",
    steps: [
      "POST /api/neo4j/verify with { user_id, activity_id, method }.",
      "Server sets User.verification_status and User.verified_at.",
      "Creates the VERIFIED_VIA edge with the method and timestamp.",
    ],
  },
  {
    id: "feedback",
    name: "Feedback",
    short: "Rating + verdicts → RATED / PREFERS_PERSON / AVOID",
    what: "Post-activity feedback writes three kinds of edge: a RATED edge from User to Activity carrying the 1–5 rating and the event note, plus per-person PREFERS_PERSON (accumulating strength) and AVOID edges between users.",
    steps: [
      "POST /api/neo4j/feedback once, with activity_rating + event_note + people_feedback map.",
      "Server creates/updates the RATED edge with the rating and note.",
      "Per-person: 'again' increments PREFERS_PERSON strength (capped 1.0); 'avoid' creates AVOID and removes any prior PREFERS_PERSON.",
      "These edges drive future match scoring — preferred people get +10, avoid pairs are excluded entirely.",
    ],
  },
  {
    id: "group",
    name: "Group",
    short: "Activity → RecurringGroup → Members",
    what: "When you choose 'same people, same activity' after a good outcome, a RecurringGroup node is created. It carries BORN_FROM to the original activity and MEMBER_OF edges from every accepted invitee plus the creator.",
    steps: [
      "POST /api/neo4j/group with { group_id, born_from_activity_id, member_user_ids[] }.",
      "Server MERGEs the RecurringGroup and writes BORN_FROM + MEMBER_OF in one transaction.",
      "DELETE /api/neo4j/group removes a single MEMBER_OF edge when someone leaves.",
    ],
  },
  {
    id: "graph-write",
    name: "Other graph writes",
    short: "Demo clear / ontology rebuild",
    what: "Operator-level writes that don't fit elsewhere — wiping demo data, rebuilding the ontology after taxonomy edits.",
    steps: [
      "POST /api/neo4j/demo-clear wipes every node and edge tagged demo:true.",
      "POST /api/neo4j/ontology re-seeds the RELATED_TO edges from taxonomy.ts.",
      "POST /api/neo4j/seed (manual) rebuilds the full seed-users + topic catalogue.",
    ],
  },
  {
    id: "visualise",
    name: "Visualise",
    short: "Subgraph render",
    what: "/api/neo4j/graph returns the activity-scoped subgraph (activity, its required topics, 1-hop RELATED_TO neighbours, all users with LIKES into any of those topics). The dev panel renders it via Neo4j NVL — click any node to expand its further connections live.",
    steps: [
      "GET /api/neo4j/graph?activityId=X.",
      "Cypher collects activity + required + neighbours + users in one round-trip.",
      "Panel feeds nodes/edges into the NVL force-directed wrapper.",
      "Click handler hits /api/neo4j/expand to fetch the next 1-hop layer and merges into the live graph.",
    ],
  },
  {
    id: "other",
    name: "Other",
    short: "Misc API calls",
    what: "Anything else the app calls — seeds, ontology introspection, etc.",
    steps: [],
  },
];

export function stageForUrl(url: string): StageId {
  if (url.startsWith("/api/transcribe")) return "transcribe";
  if (url.startsWith("/api/analyze")) return "analyse";
  if (url.startsWith("/api/suggest")) return "suggest";
  if (url.startsWith("/api/neo4j/user")) return "signup";
  if (url.startsWith("/api/neo4j/voice")) return "voice";
  if (url.startsWith("/api/neo4j/interests")) return "interests";
  if (url.startsWith("/api/neo4j/activity")) return "persist";
  if (url.startsWith("/api/neo4j/match")) return "match";
  if (url.startsWith("/api/neo4j/invites")) return "invites";
  if (url.startsWith("/api/neo4j/verify")) return "verify";
  if (url.startsWith("/api/neo4j/feedback")) return "feedback";
  if (url.startsWith("/api/neo4j/group")) return "group";
  if (url.startsWith("/api/neo4j/graph") || url.startsWith("/api/neo4j/expand")) return "visualise";
  if (url.startsWith("/api/neo4j/demo-clear") || url.startsWith("/api/neo4j/seed") || url.startsWith("/api/neo4j/ontology")) return "graph-write";
  return "other";
}

export function stageById(id: StageId): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[STAGES.length - 1];
}

// Stage rollup for the narrative strip — counts + latest status.
export interface StageRollup {
  stage: Stage;
  count: number;
  pending: number;
  errors: number;
  totalMs: number;
  latest?: DevEvent;
  status: "idle" | "running" | "done" | "error";
}

const NARRATIVE_STAGE_IDS: StageId[] = [
  "signup",
  "transcribe",
  "voice",
  "analyse",
  "interests",
  "suggest",
  "persist",
  "match",
  "invites",
  "verify",
  "feedback",
  "group",
  "visualise",
];

export function rollupStages(events: DevEvent[]): StageRollup[] {
  // events arrive newest-first; reverse-iterate to find latest per stage.
  const byStage = new Map<StageId, DevEvent[]>();
  for (const e of events) {
    const sid = stageForUrl(e.url);
    const arr = byStage.get(sid) ?? [];
    arr.push(e);
    byStage.set(sid, arr);
  }

  return NARRATIVE_STAGE_IDS.map((id) => {
    const stage = stageById(id);
    const list = byStage.get(id) ?? [];
    const pending = list.filter((e) => e.state === "pending").length;
    const errors = list.filter((e) => e.state === "error").length;
    const totalMs = list.reduce((sum, e) => sum + (e.ms ?? 0), 0);
    const status: StageRollup["status"] =
      list.length === 0
        ? "idle"
        : pending > 0
          ? "running"
          : errors > 0
            ? "error"
            : "done";
    return {
      stage,
      count: list.length,
      pending,
      errors,
      totalMs,
      latest: list[0],
      status,
    };
  });
}
