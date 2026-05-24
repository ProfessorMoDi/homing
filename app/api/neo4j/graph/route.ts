import { NextRequest, NextResponse } from "next/server";
import { withRead } from "../../../../lib/neo4j";

export const runtime = "nodejs";
export const maxDuration = 15;

// Activity-scoped subgraph for the dev panel.
//
//   activity
//     ├── REQUIRES ──→ topic (tier=specific|broader)
//     │                  └── RELATED_TO* (0..1, weighted) ──→ neighbour
//     ├── INVITED ──→ user (with status)
//     ├── ←─ VERIFIED_VIA ── user
//     └── ←─ BORN_FROM ── recurring_group
//   user ─── LIKES ──→ topic|neighbour
//   user ─── RECORDED ──→ voice_profile (creator only)
//   user ─── RATED ──→ activity (post-event)
//
// Bounded: one Activity, 1–4 REQUIRES topics, their direct RELATED_TO
// neighbours, users with LIKES into any of those topics, plus the creator's
// VoiceProfile and any RecurringGroup born from this activity.

interface GraphNode {
  id: string;
  label: string;
  kind:
    | "activity"
    | "topic-required"
    | "topic-related"
    | "user"
    | "creator"
    | "voice"
    | "group";
  meta?: Record<string, unknown>;
}

interface GraphEdge {
  from: string;
  to: string;
  kind:
    | "REQUIRES"
    | "RELATED_TO"
    | "LIKES"
    | "INVITED"
    | "RECORDED"
    | "RATED"
    | "VERIFIED_VIA"
    | "BORN_FROM"
    | "MEMBER_OF";
  weight?: number;
  tier?: string;
  related_kind?: string;
  status?: string;
  rating?: number;
}

const QUERY = `
MATCH (a:Activity {id: $activityId})
OPTIONAL MATCH (a)-[req:REQUIRES]->(t:Topic)
OPTIONAL MATCH (t)-[rel:RELATED_TO]-(n:Topic)
WITH a, collect(DISTINCT { topic: t, tier: req.tier }) AS required,
        collect(DISTINCT { from: t, to: n, kind: rel.kind, weight: rel.weight }) AS rels
WITH a, required,
     [r IN rels WHERE r.from IS NOT NULL AND r.to IS NOT NULL] AS rels
WITH a, required, rels,
     [x IN required | x.topic] + [r IN rels | r.from] + [r IN rels | r.to] AS all_topics_raw
UNWIND all_topics_raw AS topic_raw
WITH a, required, rels, collect(DISTINCT topic_raw) AS all_topics
OPTIONAL MATCH (u:User)-[:LIKES]->(lt:Topic)
WHERE lt IN all_topics
WITH a, required, rels, all_topics,
     collect(DISTINCT { user: u, topic: lt }) AS likes

// Invitees on this activity
OPTIONAL MATCH (a)-[inv:INVITED]->(iu:User)
WITH a, required, rels, all_topics, likes,
     collect(DISTINCT { user: iu, status: inv.status, responded_at: inv.responded_at }) AS invites

// Creator's voice profile (if any)
OPTIONAL MATCH (cu:User {id: a.creator_user_id})-[:RECORDED]->(vp:VoiceProfile)
WITH a, required, rels, all_topics, likes, invites,
     vp

// Recurring group born from this activity (if any)
OPTIONAL MATCH (rg:RecurringGroup)-[:BORN_FROM]->(a)
OPTIONAL MATCH (gm:User)-[:MEMBER_OF]->(rg)
WITH a, required, rels, all_topics, likes, invites, vp,
     rg, collect(DISTINCT gm) AS group_members

// Post-activity ratings
OPTIONAL MATCH (ru:User)-[rated:RATED]->(a)
WITH a, required, rels, all_topics, likes, invites, vp, rg, group_members,
     collect(DISTINCT { user: ru, rating: rated.rating, note: rated.event_note }) AS ratings

// Verified-via edges into this activity
OPTIONAL MATCH (vu:User)-[ver:VERIFIED_VIA]->(a)
WITH a, required, rels, likes, invites, vp, rg, group_members, ratings,
     collect(DISTINCT { user: vu, method: ver.method }) AS verifies

RETURN a, required, rels, likes, invites, vp, rg, group_members, ratings, verifies
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
    const invites = (rec.get("invites") as Array<{ user: NeoNode; status: string; responded_at: string }>) ?? [];
    const vp = rec.get("vp") as NeoNode | null;
    const rg = rec.get("rg") as NeoNode | null;
    const groupMembers = (rec.get("group_members") as NeoNode[]) ?? [];
    const ratings = (rec.get("ratings") as Array<{ user: NeoNode; rating: number; note: string }>) ?? [];
    const verifies = (rec.get("verifies") as Array<{ user: NeoNode; method: string }>) ?? [];

    const requiredIds = new Set<string>();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const aProps = activity.properties as Record<string, unknown>;
    const activityId2 = aProps.id as string;
    nodes.push({
      id: activityId2,
      label: (aProps.title as string) ?? activityId2,
      kind: "activity",
      meta: {
        day: aProps.day, time: aProps.time,
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
          id, label: (p.title as string) ?? id,
          kind: "topic-required",
          meta: { tier, canonical: p.canonical ?? false },
        });
        edges.push({ from: activityId2, to: id, kind: "REQUIRES", tier });
      }
    }

    // RELATED_TO neighbours
    const neighbourIds = new Set<string>();
    for (const { from, to, kind, weight } of rels) {
      const fromP = from.properties as Record<string, unknown>;
      const toP = to.properties as Record<string, unknown>;
      const fromId = fromP.id as string;
      const toId = toP.id as string;
      const outer = requiredIds.has(fromId)
        ? { id: toId, props: toP }
        : { id: fromId, props: fromP };
      if (!requiredIds.has(outer.id) && !neighbourIds.has(outer.id)) {
        neighbourIds.add(outer.id);
        nodes.push({
          id: outer.id, label: (outer.props.title as string) ?? outer.id,
          kind: "topic-related", meta: { canonical: outer.props.canonical ?? false },
        });
      }
      const [aa, bb] = fromId < toId ? [fromId, toId] : [toId, fromId];
      if (!edges.some((e) => e.kind === "RELATED_TO" &&
        ((e.from === aa && e.to === bb) || (e.from === bb && e.to === aa)))) {
        edges.push({
          from: aa, to: bb, kind: "RELATED_TO",
          weight: typeof weight === "number" ? weight : Number(weight),
          related_kind: kind,
        });
      }
    }

    // Users via LIKES
    const userIds = new Set<string>();
    function addUser(uP: Record<string, unknown>) {
      const id = uP.id as string;
      if (userIds.has(id)) return;
      userIds.add(id);
      nodes.push({
        id, label: (uP.first_name as string) ?? id,
        kind: id === creatorId ? "creator" : "user",
        meta: {
          neighbourhood: uP.neighbourhood,
          commitment_appetite: uP.commitment_appetite,
          verification_status: uP.verification_status,
        },
      });
    }
    for (const { user, topic } of likes) {
      if (!user || !topic) continue;
      const uP = user.properties as Record<string, unknown>;
      const tP = topic.properties as Record<string, unknown>;
      addUser(uP);
      edges.push({ from: uP.id as string, to: tP.id as string, kind: "LIKES" });
    }

    // Invites
    for (const { user, status } of invites) {
      if (!user) continue;
      const uP = user.properties as Record<string, unknown>;
      addUser(uP);
      edges.push({
        from: activityId2, to: uP.id as string,
        kind: "INVITED", status: status ?? "pending",
      });
    }

    // Voice profile (creator's)
    if (vp) {
      const vpP = vp.properties as Record<string, unknown>;
      const vpId = vpP.id as string;
      nodes.push({
        id: vpId,
        label: "voice profile",
        kind: "voice",
        meta: {
          source: vpP.source, language: vpP.language,
          recorded_at: vpP.recorded_at,
          transcript_preview: typeof vpP.transcript === "string"
            ? (vpP.transcript as string).slice(0, 120) + "…"
            : undefined,
        },
      });
      if (creatorId) {
        edges.push({ from: creatorId, to: vpId, kind: "RECORDED" });
      }
    }

    // Recurring group
    if (rg) {
      const gP = rg.properties as Record<string, unknown>;
      const gId = gP.id as string;
      nodes.push({
        id: gId, label: (gP.name as string) ?? gId,
        kind: "group",
        meta: { theme: gP.theme, rhythm: gP.rhythm, status: gP.status },
      });
      edges.push({ from: gId, to: activityId2, kind: "BORN_FROM" });
      for (const member of groupMembers) {
        if (!member) continue;
        const mP = member.properties as Record<string, unknown>;
        addUser(mP);
        edges.push({ from: mP.id as string, to: gId, kind: "MEMBER_OF" });
      }
    }

    // Ratings
    for (const { user, rating } of ratings) {
      if (!user) continue;
      const uP = user.properties as Record<string, unknown>;
      addUser(uP);
      edges.push({
        from: uP.id as string, to: activityId2,
        kind: "RATED",
        rating: typeof rating === "number" ? rating : Number(rating),
      });
    }

    // Verifies
    for (const { user } of verifies) {
      if (!user) continue;
      const uP = user.properties as Record<string, unknown>;
      addUser(uP);
      edges.push({ from: uP.id as string, to: activityId2, kind: "VERIFIED_VIA" });
    }

    return NextResponse.json({
      activity_id: activityId2,
      creator_user_id: creatorId,
      nodes, edges,
      counts: {
        nodes: nodes.length, edges: edges.length,
        required: requiredIds.size, related: neighbourIds.size,
        users: userIds.size,
      },
    });
  } catch (err) {
    console.error("[neo4j/graph]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

interface NeoNode { properties: Record<string, unknown>; }
