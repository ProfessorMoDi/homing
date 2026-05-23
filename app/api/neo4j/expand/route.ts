import { NextRequest, NextResponse } from "next/server";
import { withRead } from "../../../../lib/neo4j";

export const runtime = "nodejs";
export const maxDuration = 15;

// Node-expansion endpoint used by the dev panel's interactive graph.
// Given a node id + kind, return the next layer of related entities so the
// user can click-to-explore the graph outwards.
//
// Topic   → RELATED_TO neighbours + any users who LIKE this topic
// User    → all topics they LIKE  + any RELATED_TO neighbours of those topics
// Activity is treated as the "root" — expansion from it already returns the
// full subgraph via /api/neo4j/graph.

interface NodeOut {
  id: string;
  label: string;
  kind: "topic-required" | "topic-related" | "user" | "creator";
  meta?: Record<string, unknown>;
}

interface EdgeOut {
  from: string;
  to: string;
  kind: "RELATED_TO" | "LIKES";
  weight?: number;
  related_kind?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const nodeId = body?.nodeId as string | undefined;
  const kind = body?.kind as string | undefined;
  if (!nodeId || !kind) {
    return NextResponse.json(
      { error: "nodeId and kind required" },
      { status: 400 },
    );
  }

  try {
    if (kind === "topic-required" || kind === "topic-related") {
      return NextResponse.json(await expandTopic(nodeId));
    }
    if (kind === "user" || kind === "creator") {
      return NextResponse.json(await expandUser(nodeId));
    }
    return NextResponse.json(
      { error: `unsupported kind '${kind}'` },
      { status: 400 },
    );
  } catch (err) {
    console.error("[neo4j/expand]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function expandTopic(topicId: string): Promise<{ nodes: NodeOut[]; edges: EdgeOut[] }> {
  const result = await withRead((tx) =>
    tx.run(
      `MATCH (t:Topic {id: $id})
       OPTIONAL MATCH (t)-[rel:RELATED_TO]-(n:Topic)
       OPTIONAL MATCH (t)<-[:LIKES]-(u:User)
       RETURN
         collect(DISTINCT {
           from: t.id, to: n.id,
           kind: rel.kind, weight: rel.weight,
           title: n.title, canonical: n.canonical
         }) AS rels,
         collect(DISTINCT {
           user_id: u.id, first_name: u.first_name,
           neighbourhood: u.neighbourhood,
           commitment_appetite: u.commitment_appetite
         }) AS users`,
      { id: topicId },
    ),
  );

  if (result.records.length === 0) return { nodes: [], edges: [] };
  const rec = result.records[0];
  const rels = (rec.get("rels") as Array<{
    from: string; to: string; kind: string;
    weight: unknown; title: string; canonical: boolean;
  }>) ?? [];
  const users = (rec.get("users") as Array<{
    user_id: string; first_name: string;
    neighbourhood: string; commitment_appetite: string;
  }>) ?? [];

  const nodes: NodeOut[] = [];
  const edges: EdgeOut[] = [];

  for (const r of rels) {
    if (!r.to) continue;
    nodes.push({
      id: r.to,
      label: r.title ?? r.to,
      kind: "topic-related",
      meta: { canonical: r.canonical ?? false },
    });
    const [a, b] = r.from < r.to ? [r.from, r.to] : [r.to, r.from];
    edges.push({
      from: a, to: b, kind: "RELATED_TO",
      weight: toNumber(r.weight),
      related_kind: r.kind,
    });
  }

  for (const u of users) {
    if (!u.user_id) continue;
    nodes.push({
      id: u.user_id,
      label: u.first_name ?? u.user_id,
      kind: "user",
      meta: {
        neighbourhood: u.neighbourhood,
        commitment_appetite: u.commitment_appetite,
      },
    });
    edges.push({ from: u.user_id, to: topicId, kind: "LIKES" });
  }

  return { nodes, edges };
}

async function expandUser(userId: string): Promise<{ nodes: NodeOut[]; edges: EdgeOut[] }> {
  const result = await withRead((tx) =>
    tx.run(
      `MATCH (u:User {id: $id})-[:LIKES]->(t:Topic)
       RETURN collect(DISTINCT {id: t.id, title: t.title, canonical: t.canonical}) AS topics`,
      { id: userId },
    ),
  );

  if (result.records.length === 0) return { nodes: [], edges: [] };
  const topics = (result.records[0].get("topics") as Array<{
    id: string; title: string; canonical: boolean;
  }>) ?? [];

  const nodes: NodeOut[] = [];
  const edges: EdgeOut[] = [];

  for (const t of topics) {
    if (!t.id) continue;
    nodes.push({
      id: t.id,
      label: t.title ?? t.id,
      kind: "topic-related",
      meta: { canonical: t.canonical ?? false },
    });
    edges.push({ from: userId, to: t.id, kind: "LIKES" });
  }

  return { nodes, edges };
}

function toNumber(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  if (typeof (v as { toNumber?: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v) || undefined;
}
