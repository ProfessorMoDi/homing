import { NextRequest, NextResponse } from "next/server";
import { withRead } from "../../../../lib/neo4j";
import { canonicalizeTopic } from "../../../../lib/taxonomy";

export const runtime = "nodejs";
export const maxDuration = 15;

// Read-only "find your people" matcher for the demo build. Unlike
// /api/neo4j/match it is NOT anchored on a stored Activity node — it takes a
// raw list of interests, canonicalises them in-memory, and ranks everyone in
// the live graph by shared-interest score. Nothing is written: the demo build
// connects to whatever network the collect build has filled and finds
// connections in a throwaway session.
//
// Scoring mirrors the interest layer of the real matcher:
//   • direct like (0 hops along RELATED_TO)  → weight 1.0 → 50 pts
//   • 1-hop ontology neighbour               → RELATED_TO.weight (0.3–0.6)
// Per (user, requested topic) we keep the strongest path so liking both the
// exact topic and a neighbour never double-counts. Side axes (availability,
// language, …) are intentionally dropped — there is no activity context here,
// and "you share these interests with these people" is the whole point.

const MATCH_QUERY = `
UNWIND $reqIds AS reqId
MATCH (t:Topic {id: reqId})
MATCH (t)-[rel:RELATED_TO*0..1]-(t2:Topic)<-[l:LIKES]-(u:User)
WHERE coalesce(l.weight, 1) > 0
  AND ($selfId IS NULL OR u.id <> $selfId)
WITH u, t.id AS req_id, t.title AS req_title,
     t2.id AS via_id, t2.title AS via_title,
     CASE WHEN size(rel) = 0 THEN 1.0
          ELSE coalesce(rel[0].weight, 0.4)
     END AS w

// Per (user, requested topic), keep the strongest path.
WITH u, req_id, req_title,
     max(w) AS best_w,
     collect({via_id: via_id, via_title: via_title, w: w}) AS opts
WITH u, req_id, req_title, best_w,
     head([o IN opts WHERE o.w = best_w]) AS best_via

// Aggregate per user — sum weighted points + collect the winning paths.
WITH u,
     sum(best_w * 50.0) AS interest_score,
     count(DISTINCT req_id) AS shared_count,
     collect({
       req_id:    req_id,
       req_title: req_title,
       via_id:    best_via.via_id,
       via_title: best_via.via_title,
       weight:    best_w
     }) AS paths

RETURN u.id            AS user_id,
       u.first_name    AS first_name,
       u.neighbourhood AS neighbourhood,
       toInteger(interest_score) AS interest_score,
       shared_count,
       paths
ORDER BY interest_score DESC, shared_count DESC
LIMIT 12
`;

interface PathRow {
  req_id: string;
  req_title: string;
  via_id: string;
  via_title: string;
  weight: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawTopics: string[] = Array.isArray(body?.topics) ? body.topics : [];
  const selfId: string | null =
    typeof body?.selfId === "string" && body.selfId.trim() ? body.selfId : null;

  if (rawTopics.length === 0) {
    return NextResponse.json({ error: "topics[] required" }, { status: 400 });
  }

  // Canonicalise + dedupe the requested interests so "Board game" and
  // "board-games" collapse onto the same graph node.
  const canon = rawTopics
    .map((t) => canonicalizeTopic(String(t)))
    .filter((c) => c.id);
  const reqIds = Array.from(new Set(canon.map((c) => c.id)));
  const requested = canon.map((c) => ({ id: c.id, title: c.title }));

  try {
    const result = await withRead((tx) =>
      tx.run(MATCH_QUERY, { reqIds, selfId }),
    );

    const candidates = result.records.map((r) => {
      const paths = ((r.get("paths") as unknown[]) ?? [])
        .map(normalizePath)
        .filter((p): p is PathRow => p !== null);
      const interest = toNumber(r.get("interest_score"));
      return {
        user_id: r.get("user_id") as string,
        first_name: (r.get("first_name") as string) ?? "Someone",
        neighbourhood: (r.get("neighbourhood") as string) ?? "",
        score: interest,
        shared_count: toNumber(r.get("shared_count")),
        // Human-friendly shared-interest labels, e.g. "Catan", "Board games".
        shared: dedupe(paths.map((p) => p.via_title)),
        reasons: dedupe(paths.map(formatReason)),
      };
    });

    // A perfect score = liking every requested topic directly (50 pts each).
    const maxScore = reqIds.length * 50;
    const ranked = candidates.map((c) => ({
      ...c,
      // Playful "sync" percentage, capped at 99 so nothing reads as a clone.
      sync: maxScore > 0 ? Math.min(99, Math.round((c.score / maxScore) * 100)) : 0,
    }));

    return NextResponse.json({
      requested,
      requested_ids: reqIds,
      candidates: ranked,
    });
  } catch (err) {
    console.error("[neo4j/match-live]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function")
    return (v as { toNumber: () => number }).toNumber();
  return Number(v) || 0;
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

function normalizePath(raw: unknown): PathRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.req_id !== "string" || typeof o.via_id !== "string") return null;
  return {
    req_id: o.req_id,
    req_title: (o.req_title as string) ?? o.req_id,
    via_id: o.via_id,
    via_title: (o.via_title as string) ?? o.via_id,
    weight: toNumber(o.weight),
  };
}

// Direct hit: "Catan". One-hop hit: "Board games (close to Catan)".
function formatReason(p: PathRow): string {
  if (p.weight >= 0.999) return p.via_title;
  return `${p.via_title} (close to ${p.req_title})`;
}
