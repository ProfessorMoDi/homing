import { NextRequest, NextResponse } from "next/server";
import { withRead } from "../../../../lib/neo4j";

export const runtime = "nodejs";
export const maxDuration = 15;

// Anchors on Activity→Topic→User so Neo4j traverses only relevant users,
// not the full :User table. AVOID checked both directions before scoring.
const MATCH_QUERY = `
MATCH (a:Activity {id: $activityId})-[:REQUIRES]->(t:Topic)<-[:LIKES]-(u:User)
WHERE u.id <> $creatorId
  AND NOT (u)-[:AVOID]->(:User {id: $creatorId})
  AND NOT (:User {id: $creatorId})-[:AVOID]->(u)
WITH a, u

OPTIONAL MATCH (a)-[:REQUIRES {tier:'specific'}]->(st:Topic)<-[:LIKES]-(u)
WITH a, u, count(DISTINCT st) AS specificHits

OPTIONAL MATCH (a)-[:REQUIRES {tier:'broader'}]->(bt:Topic)<-[:LIKES]-(u)
WITH a, u, specificHits, count(DISTINCT bt) AS broaderHits

OPTIONAL MATCH (a)-[:REQUIRES {tier:'specific'}]->(dt:Topic)<-[:DISLIKES]-(u)
WITH a, u, specificHits, broaderHits, count(DISTINCT dt) AS dislikeHits
WHERE dislikeHits = 0

OPTIONAL MATCH (a)-[:SCHEDULED_AT]->(ts:TimeSlot)<-[:AVAILABLE_AT]-(u)
WITH a, u, specificHits, broaderHits, count(DISTINCT ts) AS availHits,
     collect(DISTINCT ts.id) AS availSlots

OPTIONAL MATCH (u)-[:COMFORTABLE_IN]->(lang:Language {id: toLower(a.language)})
WITH a, u, specificHits, broaderHits, availHits, availSlots,
     count(lang) AS langHits

OPTIONAL MATCH (:User {id: $creatorId})-[pref:PREFERS_PERSON]->(u)
WITH u, specificHits, broaderHits, availHits, availSlots, langHits,
     count(pref) AS prefHits,

  CASE WHEN specificHits > 0 THEN 50 ELSE 0 END +
  CASE WHEN specificHits = 0 AND broaderHits > 0 THEN 30 ELSE 0 END +
  CASE
    WHEN availHits > 0 AND any(s IN availSlots WHERE s = 'thursday-evening') THEN 25
    WHEN availHits > 0 AND any(s IN availSlots WHERE s IN ['every-weekend','friday-morning']) THEN 22
    WHEN availHits > 0 AND any(s IN availSlots WHERE s = 'weekday-evenings') THEN 18
    WHEN (u)-[:AVAILABLE_AT]->(:TimeSlot {id: 'flexible'}) THEN 10
    ELSE -15
  END +
  CASE WHEN langHits > 0 THEN 15 ELSE -10 END +
  CASE WHEN u.commitment_appetite IN ['try-once','maybe-weekly'] THEN 6 ELSE 0 END +
  CASE WHEN u.neighbourhood = a.location_area THEN 4 ELSE 0 END +
  CASE WHEN prefHits > 0 THEN 10 ELSE 0 END
  AS score

RETURN u.id AS user_id, u.first_name AS first_name, score
ORDER BY score DESC
LIMIT 20
`;

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
      tx.run(MATCH_QUERY, { activityId: body.activityId, creatorId: body.creatorId }),
    );

    const candidates = result.records.map((r) => ({
      user_id: r.get("user_id") as string,
      first_name: r.get("first_name") as string,
      score: toNumber(r.get("score")),
    }));

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
  return Number(v);
}
