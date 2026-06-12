import { NextRequest, NextResponse } from "next/server";
import { withRead } from "../../../../lib/neo4j";

export const runtime = "nodejs";
export const maxDuration = 15;

// Three-layer matching:
//
//   1. Direct overlap — user :LIKES a Topic that the Activity :REQUIRES.
//      Weight = 1.0, full points (50 specific / 30 broader).
//
//   2. Up-to-two-hop ontology expansion — user :LIKES a Topic within two
//      :RELATED_TO hops of a required Topic. Path weight = product of edge
//      weights, so "catan" reaches "strategy-games" at 0.5 (one sibling hop)
//      and "ticket-to-ride" at 0.6 * 0.6 = 0.36 (specific → board-games →
//      specific). Paths below 0.15 are cut as noise. This is what connects
//      two people with *different* very specific interests under a shared
//      parent — previously they only matched if one liked the parent itself.
//
//   3. Rarity (IDF-style) weighting — a required topic that few people in
//      the network like multiplies its points by up to ~1.6x, so a shared
//      niche interest ("ableton") outranks a ubiquitous one ("coffee").
//      rarity = 1 + 1 / (1 + ln(1 + likers)).
//
// The user's own LIKES.weight scales the path too (minor interests carry
// weight 0.5, hidden 0 — previously only the 0-filter was applied), and the
// creator's / candidate's "same-gender" group preference is respected as a
// mutual hard filter.
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
// Creator node may not exist yet (e.g. read-only demo session) — the gender
// clauses below tolerate NULL so matching still works without it.
OPTIONAL MATCH (creator:User {id: $creatorId})
MATCH (a:Activity {id: $activityId})-[req:REQUIRES]->(t:Topic)
MATCH (t)-[rel:RELATED_TO*0..2]-(t2:Topic)<-[l:LIKES]-(u:User)
WHERE u.id <> $creatorId
  AND coalesce(l.weight, 1) > 0
  AND NOT (u)-[:AVOID]->(:User {id: $creatorId})
  AND NOT (:User {id: $creatorId})-[:AVOID]->(u)
  AND (creator IS NULL
       OR ((coalesce(u.gender_preference, '') <> 'same-gender' OR u.gender = creator.gender)
       AND (coalesce(creator.gender_preference, '') <> 'same-gender' OR creator.gender = u.gender)))
  AND NOT EXISTS {
    MATCH (a)-[:REQUIRES {tier:'specific'}]->(:Topic)<-[:DISLIKES]-(u)
  }

WITH a, u,
     req.tier  AS tier,
     t.id      AS req_id,
     t.title   AS req_title,
     COUNT { (t)<-[:LIKES]-(:User) } AS req_likers,
     t2.id     AS via_id,
     t2.title  AS via_title,
     reduce(w = 1.0, r IN rel | w * coalesce(r.weight, 0.4))
       * coalesce(l.weight, 1.0) AS w
WHERE w >= 0.15

// Per (user, required topic), keep the strongest path.
WITH a, u, tier, req_id, req_title, req_likers,
     max(w) AS best_w,
     collect({via_id: via_id, via_title: via_title, w: w}) AS opts
WITH a, u, tier, req_id, req_title, best_w,
     1.0 + 1.0 / (1.0 + log(1 + req_likers)) AS rarity,
     head([o IN opts WHERE o.w = best_w]) AS best_via

// Aggregate per (activity, user) — sum weighted points + collect paths.
WITH a, u,
     sum((CASE WHEN tier = 'specific' THEN 50.0 ELSE 30.0 END)
         * best_w * rarity) AS interest_score,
     collect({
       req_id:    req_id,
       req_title: req_title,
       via_id:    best_via.via_id,
       via_title: best_via.via_title,
       weight:    best_w,
       rarity:    rarity,
       tier:      tier
     }) AS paths

RETURN u.id                  AS user_id,
       u.first_name          AS first_name,
       u.neighbourhood       AS neighbourhood,
       toInteger(interest_score) AS interest_score,
       toInteger(interest_score) AS score,
       paths
ORDER BY score DESC, size(paths) DESC
LIMIT 20
`;

interface PathRecord {
  req_id: string;
  req_title: string;
  via_id: string;
  via_title: string;
  weight: number;
  rarity: number;
  tier: "specific" | "broader";
}

interface Candidate {
  user_id: string;
  first_name: string;
  neighbourhood: string;
  score: number;
  breakdown: {
    interest: number;
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
      // Strongest + rarest paths first so the lead reason is the most
      // specific shared interest, not a generic one-hop neighbour.
      const paths = ((r.get("paths") as unknown[]) ?? [])
        .map((p) => normalizePath(p))
        .filter((p): p is PathRecord => p !== null)
        .sort((a, b) => b.weight - a.weight || b.rarity - a.rarity);
      return {
        user_id: r.get("user_id") as string,
        first_name: r.get("first_name") as string,
        neighbourhood: (r.get("neighbourhood") as string) ?? "",
        score: toNumber(r.get("score")),
        breakdown: {
          interest: toNumber(r.get("interest_score")),
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
    rarity: toNumber(o.rarity) || 1,
    tier: o.tier === "broader" ? "broader" : "specific",
  };
}

// Direct hit: "Likes Catan". One-hop hit: "Likes Strategy games (related to Catan)".
function formatReason(p: PathRecord): string {
  if (p.weight >= 0.999) return `Likes ${p.via_title}`;
  return `Likes ${p.via_title} (related to ${p.req_title})`;
}
