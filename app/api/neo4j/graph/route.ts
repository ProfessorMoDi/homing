import { NextRequest, NextResponse } from "next/server";
import { withRead } from "../../../../lib/neo4j";

export const runtime = "nodejs";
export const maxDuration = 15;

// Activity-scoped subgraph for the dev panel.
//
//   activity
//     └── REQUIRES ──→ topic (tier=specific|broader)
//                        └── RELATED_TO* (0..1, weighted) ──→ neighbour
//   user ─── LIKES ──→ topic|neighbour
//
// We deliberately bound the result so the SVG render stays simple (~30 nodes
// for a typical activity): one Activity, 1–4 REQUIRES topics, each topic's
// direct RELATED_TO neighbours, and the users who LIKE any of those topics.
// AVOID/PREFERS_PERSON edges between users are not included — the panel is
// about explaining the topic→match path, not the full social graph.

interface GraphNode {
  id: string;
  label: string;
  kind: "activity" | "topic-required" | "topic-related" | "user" | "creator";
  meta?: Record<string, unknown>;
}

interface GraphEdge {
  from: string;
  to: string;
  kind: "REQUIRES" | "RELATED_TO" | "LIKES";
  weight?: number;
  tier?: string;          // for REQUIRES
  related_kind?: string;  // for RELATED_TO (broader/sibling/adjacent)
}

const QUERY = `
MATCH (a:Activity {id: $activityId})
OPTIONAL MATCH (a)-[req:REQUIRES]->(t:Topic)
OPTIONAL MATCH (t)-[rel:RELATED_TO]-(n:Topic)
WITH a, collect(DISTINCT { topic: t, tier: req.tier })           AS required,
        collect(DISTINCT { from: t, to: n, kind: rel.kind, weight: rel.weight }) AS rels
WITH a,
     required,
     [r IN rels WHERE r.from IS NOT NULL AND r.to IS NOT NULL]   AS rels

// Collect all topics involved: required + neighbours.
WITH a, required, rels,
     [x IN required | x.topic] +
     [r IN rels    | r.from]   +
     [r IN rels    | r.to]     AS all_topics_raw
UNWIND all_topics_raw AS topic_raw
WITH a, required, rels, collect(DISTINCT topic_raw) AS all_topics

// Pull users that LIKE any of those topics (creator included so it shows the
// "this is your interest" link).
OPTIONAL MATCH (u:User)-[:LIKES]->(lt:Topic)
WHERE lt IN all_topics
WITH a, required, rels, all_topics,
     collect(DISTINCT { user: u, topic: lt }) AS likes

RETURN a, required, rels, all_topics, likes
`;

export async function GET(req: NextRequest) {
  const activityId = req.nextUrl.searchParams.get("activityId");
  if (!activityId) {
    return NextResponse.json(
      { error: "activityId query param required" },
      { status: 400 },
    );
  }

  try {
    const result = await withRead((tx) => tx.run(QUERY, { activityId }));
    if (result.records.length === 0) {
      return NextResponse.json({ error: "activity not found", activityId }, { status: 404 });
    }
    const rec = result.records[0];
    const activity = rec.get("a");
    if (!activity) {
      return NextResponse.json({ error: "activity not found", activityId }, { status: 404 });
    }

    const required = (rec.get("required") as Array<{ topic: NeoNode; tier: string }>) ?? [];
    const rels = (rec.get("rels") as Array<{ from: NeoNode; to: NeoNode; kind: string; weight: number }>) ?? [];
    const likes = (rec.get("likes") as Array<{ user: NeoNode; topic: NeoNode }>) ?? [];

    const requiredIds = new Set<string>();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Activity node
    const aProps = activity.properties as Record<string, unknown>;
    nodes.push({
      id: aProps.id as string,
      label: (aProps.title as string) ?? (aProps.id as string),
      kind: "activity",
      meta: {
        day: aProps.day,
        time: aProps.time,
        location_area: aProps.location_area,
        language: aProps.language,
      },
    });
    const creatorId = aProps.creator_user_id as string | undefined;

    // Required topics
    for (const { topic, tier } of required) {
      if (!topic) continue;
      const p = topic.properties as Record<string, unknown>;
      const id = p.id as string;
      if (!requiredIds.has(id)) {
        requiredIds.add(id);
        nodes.push({
          id,
          label: (p.title as string) ?? id,
          kind: "topic-required",
          meta: { tier, canonical: p.canonical ?? false },
        });
        edges.push({
          from: aProps.id as string,
          to: id,
          kind: "REQUIRES",
          tier,
        });
      }
    }

    // RELATED_TO neighbours (skip ones that ARE required — those are already
    // in the required ring).
    const neighbourIds = new Set<string>();
    for (const { from, to, kind, weight } of rels) {
      const fromP = from.properties as Record<string, unknown>;
      const toP = to.properties as Record<string, unknown>;
      const fromId = fromP.id as string;
      const toId = toP.id as string;
      // We added required topics already. The "outer" node is whichever end
      // isn't required.
      const outer = requiredIds.has(fromId) ? { id: toId, props: toP } : { id: fromId, props: fromP };
      if (!requiredIds.has(outer.id) && !neighbourIds.has(outer.id)) {
        neighbourIds.add(outer.id);
        nodes.push({
          id: outer.id,
          label: (outer.props.title as string) ?? outer.id,
          kind: "topic-related",
          meta: { canonical: outer.props.canonical ?? false },
        });
      }
      // Undirected logical edge — store with a stable id ordering.
      const [a, b] = fromId < toId ? [fromId, toId] : [toId, fromId];
      const exists = edges.some(
        (e) => e.kind === "RELATED_TO" && ((e.from === a && e.to === b) || (e.from === b && e.to === a)),
      );
      if (!exists) {
        edges.push({
          from: a,
          to: b,
          kind: "RELATED_TO",
          weight: typeof weight === "number" ? weight : Number(weight),
          related_kind: kind,
        });
      }
    }

    // Users (LIKES into either required or neighbour topics).
    const userIds = new Set<string>();
    for (const { user, topic } of likes) {
      if (!user || !topic) continue;
      const uP = user.properties as Record<string, unknown>;
      const tP = topic.properties as Record<string, unknown>;
      const uId = uP.id as string;
      const tId = tP.id as string;
      if (!userIds.has(uId)) {
        userIds.add(uId);
        nodes.push({
          id: uId,
          label: (uP.first_name as string) ?? uId,
          kind: uId === creatorId ? "creator" : "user",
          meta: {
            neighbourhood: uP.neighbourhood,
            commitment_appetite: uP.commitment_appetite,
          },
        });
      }
      edges.push({ from: uId, to: tId, kind: "LIKES" });
    }

    return NextResponse.json({
      activity_id: aProps.id,
      creator_user_id: creatorId,
      nodes,
      edges,
      counts: {
        nodes: nodes.length,
        edges: edges.length,
        required: requiredIds.size,
        related: neighbourIds.size,
        users: userIds.size,
      },
    });
  } catch (err) {
    console.error("[neo4j/graph]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Local — Neo4j Node shape (without importing the full driver types here).
interface NeoNode {
  properties: Record<string, unknown>;
}
