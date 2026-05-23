import type { ManagedTransaction } from "neo4j-driver";
import { withWrite } from "./neo4j";
import {
  CANONICAL_TOPICS,
  EDGE_WEIGHT,
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
}

export async function seedOntology(
  tx: ManagedTransaction,
): Promise<OntologyStats> {
  let topicCount = 0;
  let edgeCount = 0;

  // Pass 1: ensure every canonical topic exists as a node with its title.
  for (const [id, def] of Object.entries(CANONICAL_TOPICS)) {
    await tx.run(
      `MERGE (t:Topic {id: $id})
         SET t.title = $title,
             t.canonical = true`,
      { id, title: def.title },
    );
    topicCount++;
  }

  // Pass 2: write edges. Skip duplicates (we don't want both A→B and B→A
  // since the query treats RELATED_TO as undirected); we pick a deterministic
  // direction by id ordering for siblings/adjacent so re-runs don't churn.
  for (const [id, def] of Object.entries(CANONICAL_TOPICS)) {
    for (const parentId of def.parents ?? []) {
      await mergeEdge(tx, id, parentId, "broader");
      edgeCount++;
    }
    for (const siblingId of def.siblings ?? []) {
      if (id < siblingId) {
        await mergeEdge(tx, id, siblingId, "sibling");
        edgeCount++;
      }
    }
    for (const adjacentId of def.adjacent ?? []) {
      if (id < adjacentId) {
        await mergeEdge(tx, id, adjacentId, "adjacent");
        edgeCount++;
      }
    }
  }

  return { topics: topicCount, edges: edgeCount };
}

async function mergeEdge(
  tx: ManagedTransaction,
  fromId: string,
  toId: string,
  kind: TopicEdgeKind,
): Promise<void> {
  await tx.run(
    `MERGE (from:Topic {id: $fromId})
     MERGE (to:Topic {id: $toId})
     MERGE (from)-[r:RELATED_TO {kind: $kind}]->(to)
       SET r.weight = $weight`,
    { fromId, toId, kind, weight: EDGE_WEIGHT[kind] },
  );
}

// Standalone helper for repair / manual invocation outside seed flow.
export async function reseedOntology(): Promise<OntologyStats> {
  return withWrite((tx) => seedOntology(tx));
}
