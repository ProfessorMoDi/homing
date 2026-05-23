import { NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";

export const runtime = "nodejs";
export const maxDuration = 15;

// Wipes every node and relationship tagged `demo: true`. Used by the dev
// panel's "Clear demo data" button to reset between demos without touching
// seeded users, real signups, or the ontology.

export async function POST() {
  try {
    const result = await withWrite(async (tx) => {
      const rels = await tx.run(
        `MATCH ()-[r {demo: true}]-() DELETE r RETURN count(r) AS deleted`,
      );
      const nodes = await tx.run(
        `MATCH (n {demo: true}) DETACH DELETE n RETURN count(n) AS deleted`,
      );
      return {
        rels_deleted: toNumber(rels.records[0]?.get("deleted")),
        nodes_deleted: toNumber(nodes.records[0]?.get("deleted")),
      };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[neo4j/demo-clear]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof (v as { toNumber?: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v) || 0;
}
