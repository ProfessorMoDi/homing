import type { ManagedTransaction } from "neo4j-driver";
import { withWrite } from "./neo4j";
import {
  CANONICAL_TOPICS,
  EDGE_WEIGHT,
  inferTopicLinks,
  type TopicEdgeKind,
} from "./taxonomy";

// Idempotently writes the canonical Topic catalogue + RELATED_TO edges into
// the graph. Called from seedDatabase(). Safe to re-run — uses MERGE on
// both nodes and edges, and rewrites edge properties on each pass so weight
// adjustments in taxonomy.ts flow through without manual cleanup.
//
// Edge semantics:
//   (specific)-[:RELATED_TO {kind:'broader', weight:0.6}]->(broader)
//   (sibling-a)-[:RELATED_TO {kind:'sibling', weight:0.5}]->(sibling-b)
//   (a)-[:RELATED_TO {kind:'adjacent', weight:0.3}]->(b)
//
// Direction is stable but the match query reads :RELATED_TO without arrow
// (undirected) so traversal symmetry is preserved.

export interface OntologyStats {
  topics: number;
  edges: number;
  inferred_links?: number;
}

export async function seedOntology(
  tx: ManagedTransaction,
): Promise<OntologyStats> {
  // Pass 1: ensure every canonical topic exists as a node with its title.
  // One UNWIND batch instead of one round trip per topic.
  const topics = Object.entries(CANONICAL_TOPICS).map(([id, def]) => ({
    id,
    title: def.title,
  }));
  await tx.run(
    `UNWIND $topics AS topic
     MERGE (t:Topic {id: topic.id})
       SET t.title = topic.title,
           t.canonical = true`,
    { topics },
  );

  // Pass 2: collect edges, then write in one batch. Skip duplicates (we don't
  // want both A→B and B→A since the query treats RELATED_TO as undirected);
  // we pick a deterministic direction by id ordering for siblings/adjacent so
  // re-runs don't churn.
  const edges: Array<{ fromId: string; toId: string; kind: TopicEdgeKind; weight: number }> = [];
  const addEdge = (fromId: string, toId: string, kind: TopicEdgeKind) =>
    edges.push({ fromId, toId, kind, weight: EDGE_WEIGHT[kind] });

  for (const [id, def] of Object.entries(CANONICAL_TOPICS)) {
    for (const parentId of def.parents ?? []) addEdge(id, parentId, "broader");
    for (const siblingId of def.siblings ?? []) {
      if (id < siblingId) addEdge(id, siblingId, "sibling");
    }
    for (const adjacentId of def.adjacent ?? []) {
      if (id < adjacentId) addEdge(id, adjacentId, "adjacent");
    }
  }

  await tx.run(
    `UNWIND $edges AS edge
     MERGE (from:Topic {id: edge.fromId})
     MERGE (to:Topic {id: edge.toId})
     MERGE (from)-[r:RELATED_TO {kind: edge.kind}]->(to)
       SET r.weight = edge.weight`,
    { edges },
  );

  return { topics: topics.length, edges: edges.length };
}

// Backfill: link existing non-canonical (long-tail) Topic nodes into the
// ontology via token containment ("korean-cooking" → "cooking"). Tag-derived
// links can't be reconstructed here (tags aren't stored on Topic nodes) —
// those accrue naturally whenever a user's interests re-sync through
// writeInterests. Idempotent: MERGE on the same (pair, kind).
export async function backfillInferredLinks(
  tx: ManagedTransaction,
): Promise<number> {
  const res = await tx.run(
    `MATCH (t:Topic) WHERE coalesce(t.canonical, false) = false
     RETURN t.id AS id`,
  );
  const links: Array<{ fromId: string; toId: string; kind: string; weight: number }> = [];
  for (const rec of res.records) {
    const id = rec.get("id") as string;
    for (const l of inferTopicLinks(id, [])) {
      links.push({ fromId: id, toId: l.toId, kind: l.kind, weight: l.weight });
    }
  }
  if (links.length > 0) {
    await tx.run(
      `UNWIND $links AS link
       MATCH (from:Topic {id: link.fromId})
       MERGE (to:Topic {id: link.toId})
       MERGE (from)-[r:RELATED_TO {kind: link.kind}]->(to)
         SET r.weight = link.weight, r.inferred = true`,
      { links },
    );
  }
  return links.length;
}

// Standalone helper for repair / manual invocation outside seed flow.
// Also backfills inferred links for long-tail topics already in the graph,
// so a single POST /api/neo4j/ontology heals both canonical and inferred
// connectivity.
export async function reseedOntology(): Promise<OntologyStats> {
  return withWrite(async (tx) => {
    const stats = await seedOntology(tx);
    const inferred = await backfillInferredLinks(tx);
    return { ...stats, inferred_links: inferred };
  });
}
