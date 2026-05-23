import { NextRequest, NextResponse } from "next/server";
import { withRead } from "../../../../lib/neo4j";

export const runtime = "nodejs";
export const maxDuration = 15;

// Two-layer matching:
//
//   1. Direct overlap — user :LIKES a Topic that the Activity :REQUIRES.
//      Weight = 1.0, full points (50 specific / 30 broader).
//
//   2. One-hop ontology expansion — user :LIKES a Topic that is :RELATED_TO
//      a required Topic. Weight = edge weight (0.6 broader / 0.5 sibling /
//      0.3 adjacent), so e.g. liking "strategy-games" for a "catan"-required
//      activity scores 50 * 0.5 = 25 instead of 0.
//
// Per (user, requirement) we take the strongest path so a user who likes
// both the exact topic and a neighbour doesn't get scored twice for it. The
// activity-level interest score is the sum across requirements.
//
// We also return the path that won — `via_id` / `via_title` / `weight` —
// which the UI surfaces as "Likes Strategy games (related to Catan)". That
// explainability is the whole point of doing this in a graph rather than
// with embeddings: every match has a traceable reason.

const MATCH_QUERY = `
MATCH (a:Activity {id: $activityId})-[req:REQUIRES]->(t:Topic)
MATCH (t)-[rel:RELATED_TO*0..1]-(t2:Topic)<-[:LIKES]-(u:User)
WHERE u.id <> $creatorId
  AND NOT (u)-[:AVOID]->(:User {id: $creatorId})
  AND NOT (:User {id: $creatorId})-[:AVOID]->(u)
  AND NOT EXISTS {
    MATCH (a)-[:REQUIRES {tier:'specific'}]->(:Topic)<-[:DISLIKES]-(u)
  }

WITH a, u,
     req.tier  AS tier,
     t.id      AS req_id,
     t.title   AS req_title,
     t2.id     AS via_id,
     t2.title  AS via_title,
     CASE WHEN size(rel) = 0 THEN 1.0
          ELSE coalesce(rel[0].weight, 0.4)
     END       AS w

// Per (user, required topic), keep the strongest path.
WITH a, u, tier, req_id, req_title,
     max(w) AS best_w,
     collect({via_id: via_id, via_title: via_title, w: w}) AS opts
WITH a, u, tier, req_id, req_title, best_w,
     head([o IN opts WHERE o.w = best_w]) AS best_via

// Aggregate per (activity, user) — sum weighted points + collect paths.
WITH a, u,
     sum(CASE WHEN tier = 'specific' THEN best_w * 50.0
              ELSE                        best_w * 30.0
         END) AS interest_score,
     collect({
       req_id:    req_id,
       req_title: req_title,
       via_id:    best_via.via_id,
       via_title: best_via.via_title,
       weight:    best_w,
       tier:      tier
     }) AS paths

OPTIONAL MATCH (a)-[:SCHEDULED_AT]->(ts:TimeSlot)<-[:AVAILABLE_AT]-(u)
WITH a, u, interest_score, paths,
     count(DISTINCT ts) AS availHits,
     collect(DISTINCT ts.id) AS availSlots

OPTIONAL MATCH (u)-[:COMFORTABLE_IN]->(lang:Language {id: toLower(a.language)})
WITH a, u, interest_score, paths, availHits, availSlots,
     count(lang) AS langHits

OPTIONAL MATCH (:User {id: $creatorId})-[pref:PREFERS_PERSON]->(u)
WITH a, u, interest_score, paths, availHits, availSlots, langHits,
     count(pref) AS prefHits

WITH u, interest_score, paths,
     CASE
       WHEN availHits > 0 AND any(s IN availSlots WHERE s = 'thursday-evening')                THEN 25
       WHEN availHits > 0 AND any(s IN availSlots WHERE s IN ['every-weekend','friday-morning']) THEN 22
       WHEN availHits > 0 AND any(s IN availSlots WHERE s = 'weekday-evenings')                 THEN 18
       WHEN (u)-[:AVAILABLE_AT]->(:TimeSlot {id: 'flexible'})                                    THEN 10
       ELSE -15
     END AS availability_score,
     CASE WHEN langHits > 0 THEN 15 ELSE -10 END AS language_score,
     CASE WHEN u.commitment_appetite IN ['try-once','maybe-weekly'] THEN 6 ELSE 0 END AS commitment_score,
     CASE WHEN u.neighbourhood = a.location_area THEN 4 ELSE 0 END AS location_score,
     CASE WHEN prefHits > 0 THEN 10 ELSE 0 END AS preference_score

RETURN u.id                  AS user_id,
       u.first_name          AS first_name,
       u.neighbourhood       AS neighbourhood,
       toInteger(interest_score)                                  AS interest_score,
       availability_score, language_score, commitment_score,
       location_score, preference_score,
       toInteger(interest_score) + availability_score + language_score +
         commitment_score + location_score + preference_score     AS score,
       paths
ORDER BY score DESC
LIMIT 20
`;

interface PathRecord {
  req_id: string;
  req_title: string;
  via_id: string;
  via_title: string;
  weight: number;
  tier: "specific" | "broader";
}

interface Candidate {
  user_id: string;
  first_name: string;
  neighbourhood: string;
  score: number;
  breakdown: {
    interest: number;
    availability: number;
    language: number;
    commitment: number;
    location: number;
    preference: number;
  };
  paths: PathRecord[];
  reasons: string[];
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.activityId || !body?.creatorId) {
    return NextResponse.json(
      { error: "activityId and creatorId required" },
      { status: 400 },
    );
  }

  try {
    const result = await withRead((tx) =>
      tx.run(MATCH_QUERY, {
        activityId: body.activityId,
        creatorId: body.creatorId,
      }),
    );

    const candidates: Candidate[] = result.records.map((r) => {
      const paths = ((r.get("paths") as unknown[]) ?? [])
        .map((p) => normalizePath(p))
        .filter((p): p is PathRecord => p !== null);
      return {
        user_id: r.get("user_id") as string,
        first_name: r.get("first_name") as string,
        neighbourhood: (r.get("neighbourhood") as string) ?? "",
        score: toNumber(r.get("score")),
        breakdown: {
          interest: toNumber(r.get("interest_score")),
          availability: toNumber(r.get("availability_score")),
          language: toNumber(r.get("language_score")),
          commitment: toNumber(r.get("commitment_score")),
          location: toNumber(r.get("location_score")),
          preference: toNumber(r.get("preference_score")),
        },
        paths,
        reasons: paths.map(formatReason),
      };
    });

    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("[neo4j/match]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function")
    return (v as { toNumber: () => number }).toNumber();
  return Number(v) || 0;
}

function normalizePath(raw: unknown): PathRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.req_id !== "string" || typeof o.via_id !== "string") return null;
  return {
    req_id: o.req_id,
    req_title: (o.req_title as string) ?? o.req_id,
    via_id: o.via_id,
    via_title: (o.via_title as string) ?? o.via_id,
    weight: toNumber(o.weight),
    tier: o.tier === "broader" ? "broader" : "specific",
  };
}

// Direct hit: "Likes Catan". One-hop hit: "Likes Strategy games (related to Catan)".
function formatReason(p: PathRecord): string {
  if (p.weight >= 0.999) return `Likes ${p.via_title}`;
  return `Likes ${p.via_title} (related to ${p.req_title})`;
}
