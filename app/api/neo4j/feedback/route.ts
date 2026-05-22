import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import type { PostActivityFeedback } from "../../../../lib/types";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const feedback: PostActivityFeedback = await req.json().catch(() => null);
  if (!feedback?.user_id || !feedback?.activity_id) {
    return NextResponse.json(
      { error: "user_id and activity_id required" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  try {
    await withWrite(async (tx) => {
      for (const [targetId, verdict] of Object.entries(feedback.people_feedback)) {
        if (verdict === "avoid") {
          // Create AVOID edge, remove any PREFERS_PERSON in same direction
          await tx.run(
            `MATCH (from:User {id: $fromId}), (to:User {id: $toId})
             MERGE (from)-[r:AVOID]->(to)
             SET r.since = $since, r.activity_id = $activityId`,
            { fromId: feedback.user_id, toId: targetId, since: now, activityId: feedback.activity_id },
          );
          await tx.run(
            `MATCH (from:User {id: $fromId})-[r:PREFERS_PERSON]->(to:User {id: $toId}) DELETE r`,
            { fromId: feedback.user_id, toId: targetId },
          );
        } else if (verdict === "again") {
          // Accumulate PREFERS_PERSON strength (capped at 1.0), remove any AVOID
          await tx.run(
            `MATCH (from:User {id: $fromId}), (to:User {id: $toId})
             MERGE (from)-[r:PREFERS_PERSON]->(to)
             ON CREATE SET r.strength = 0.5, r.count = 1
             ON MATCH SET r.strength = CASE WHEN r.strength + 0.2 > 1.0 THEN 1.0
                                            ELSE r.strength + 0.2 END,
                          r.count = r.count + 1`,
            { fromId: feedback.user_id, toId: targetId },
          );
          await tx.run(
            `MATCH (from:User {id: $fromId})-[r:AVOID]->(to:User {id: $toId}) DELETE r`,
            { fromId: feedback.user_id, toId: targetId },
          );
        }
        // "neutral" — no graph change
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[neo4j/feedback]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
