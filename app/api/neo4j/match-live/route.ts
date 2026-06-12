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
//   • 1–2 hop ontology path                  → product of RELATED_TO weights
//     (floor 0.15), so two different specifics under a shared parent connect
//   • the candidate's own LIKES.weight scales the path (minor interests 0.5)
//   • rarity boost: niche requested topics count up to ~1.6x more than ones
//     half the network likes — rarity = 1 + 1 / (1 + ln(1 + likers))
// Per (user, requested topic) we keep the strongest path so liking both the
// exact topic and a neighbour never double-counts. Side axes (availability,
// language, …) are intentionally dropped — there is no activity context here,
// and "you share these interests with these people" is the whole point.
//
// `base_score` (no rarity) feeds the sync %, so 100% still means "direct
// full-weight like on every requested topic"; rarity only affects ranking.

const MATCH_QUERY = `
UNWIND $reqIds AS reqId
MATCH (t:Topic {id: reqId})
MATCH (t)-[rel:RELATED_TO*0..2]-(t2:Topic)<-[l:LIKES]-(u:User)
WHERE coalesce(l.weight, 1) > 0
  AND ($selfId IS NULL OR u.id <> $selfId)
WITH u, t.id AS req_id, t.title AS req_title,
     COUNT { (t)<-[:LIKES]-(:User) } AS req_likers,
     t2.id AS via_id, t2.title AS via_title,
     reduce(w = 1.0, r IN rel | w * coalesce(r.weight, 0.4))
       * coalesce(l.weight, 1.0) AS w
WHERE w >= 0.15

// Per (user, requested topic), keep the strongest path.
WITH u, req_id, req_title, req_likers,
     max(w) AS best_w,
     collect({via_id: via_id, via_title: via_title, w: w}) AS opts
WITH u, req_id, req_title, best_w,
     1.0 + 1.0 / (1.0 + log(1 + req_likers)) AS rarity,
     head([o IN opts WHERE o.w = best_w]) AS best_via

// Aggregate per user — sum weighted points + collect the winning paths.
WITH u,
     sum(best_w * 50.0 * rarity) AS interest_score,
     sum(best_w * 50.0) AS base_score,
     count(DISTINCT req_id) AS shared_count,
     collect({
       req_id:    req_id,
       req_title: req_title,
       via_id:    best_via.via_id,
       via_title: best_via.via_title,
       weight:    best_w,
       rarity:    rarity
     }) AS paths

RETURN u.id            AS user_id,
       u.first_name    AS first_name,
       u.neighbourhood AS neighbourhood,
       toInteger(interest_score) AS interest_score,
       base_score,
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
  rarity: number;
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
      // Strongest + rarest first so the lead reason is the most specific
      // shared interest, not a generic neighbour.
      const paths = ((r.get("paths") as unknown[]) ?? [])
        .map(normalizePath)
        .filter((p): p is PathRow => p !== null)
        .sort((a, b) => b.weight - a.weight || b.rarity - a.rarity);
      const interest = toNumber(r.get("interest_score"));
      const base = toNumber(r.get("base_score"));
      const userId = r.get("user_id") as string;
      return {
        user_id: userId,
        first_name: memberLabel(r.get("first_name") as string | null, userId),
        neighbourhood: (r.get("neighbourhood") as string) ?? "",
        score: interest,
        base_score: base,
        shared_count: toNumber(r.get("shared_count")),
        // Human-friendly shared-interest labels, e.g. "Catan", "Board games".
        shared: dedupe(paths.map((p) => p.via_title)),
        reasons: dedupe(paths.map(formatReason)),
      };
    });

    // A perfect sync = direct full-weight like on every requested topic
    // (50 base pts each) — rarity is ranking-only and excluded here.
    const maxScore = reqIds.length * 50;
    const ranked = candidates.map(({ base_score, ...c }) => ({
      ...c,
      // Playful "sync" percentage, capped at 99 so nothing reads as a clone.
      sync:
        maxScore > 0
          ? Math.min(99, Math.round((base_score / maxScore) * 100))
          : 0,
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

function memberLabel(firstName: string | null | undefined, userId: string): string {
  const name = firstName?.trim();
  if (name) return name;
  const slug = userId.replace(/^u_/, "").replace(/-/g, " ").trim();
  if (slug && slug !== "demo" && slug !== "anon") {
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
  return "HOMING member";
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
    rarity: toNumber(o.rarity) || 1,
  };
}

// Direct hit: "Catan". One-hop hit: "Board games (close to Catan)".
function formatReason(p: PathRow): string {
  if (p.weight >= 0.999) return p.via_title;
  return `${p.via_title} (close to ${p.req_title})`;
}
