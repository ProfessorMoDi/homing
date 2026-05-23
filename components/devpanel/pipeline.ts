// Shared knowledge: what the pipeline stages are, how to map an event URL
// to a stage, and the educational copy used by the narrative + per-call
// explainers. Keeping it in one module so the strip and the detail view
// always agree.

import type { DevEvent } from "../../lib/devBus";

export type StageId =
  | "transcribe"
  | "analyse"
  | "suggest"
  | "persist"
  | "match"
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
    what: "The weighted match query traverses the activity's REQUIRES edges, expands them by 1 hop along RELATED_TO, intersects with user :LIKES, and computes a six-axis score per candidate. The graph paths that won are returned as human reasons.",
    steps: [
      "POST /api/neo4j/match with { activityId, creatorId }.",
      "Cypher: MATCH (a)-[:REQUIRES]->(t)-[:RELATED_TO*0..1]-(t2)<-[:LIKES]-(u). Direct hit gets weight 1.0; 1-hop hit gets the edge's weight (0.6 broader / 0.5 sibling / 0.3 adjacent).",
      "Per (user, requirement) we take max(weight) so direct + indirect matches don't double-count.",
      "Sum: specific × 50 + broader × 30, each scaled by weight. Then add availability / language / commitment / location / preference bonuses.",
      "AVOID edges and DISLIKES of any required specific topic exclude candidates entirely.",
      "Top 20 returned with paths array — what topic via what topic — and a reasons array like 'Likes Casual games (related to Board games)'.",
    ],
  },
  {
    id: "graph-write",
    name: "Other graph writes",
    short: "User upsert / feedback",
    what: "User profile changes and post-activity feedback also write to the graph. User edges: LIKES, AVAILABLE_AT, SPEAKS, COMFORTABLE_IN. Feedback edges: PREFERS_PERSON, AVOID.",
    steps: [
      "POST /api/neo4j/user rebuilds the user's outgoing edges.",
      "POST /api/neo4j/feedback writes AVOID for 'avoid' verdicts, accumulates PREFERS_PERSON strength for 'again' verdicts.",
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
  if (url.startsWith("/api/neo4j/activity")) return "persist";
  if (url.startsWith("/api/neo4j/match")) return "match";
  if (url.startsWith("/api/neo4j/graph") || url.startsWith("/api/neo4j/expand")) return "visualise";
  if (url.startsWith("/api/neo4j/user") || url.startsWith("/api/neo4j/feedback") || url.startsWith("/api/neo4j/seed")) return "graph-write";
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
  "transcribe",
  "analyse",
  "suggest",
  "persist",
  "match",
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
