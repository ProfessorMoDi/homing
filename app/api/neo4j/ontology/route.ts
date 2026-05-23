import { NextResponse } from "next/server";
import { withRead } from "../../../../lib/neo4j";
import { reseedOntology } from "../../../../lib/neo4j-ontology";
import { listTaxonomy } from "../../../../lib/taxonomy";

export const runtime = "nodejs";
export const maxDuration = 15;

// GET — returns both the static taxonomy and a live snapshot of what's
// actually persisted in Neo4j (Topic nodes + RELATED_TO edges). Useful as a
// debug surface and as a demo-ready inspector for the BCG walkthrough.
export async function GET() {
  try {
    const live = await withRead(async (tx) => {
      const nodes = await tx.run(
        `MATCH (t:Topic)
         RETURN t.id AS id, t.title AS title, t.tier AS tier,
                t.canonical AS canonical
         ORDER BY id`,
      );
      const edges = await tx.run(
        `MATCH (a:Topic)-[r:RELATED_TO]->(b:Topic)
         RETURN a.id AS from, b.id AS to, r.kind AS kind, r.weight AS weight
         ORDER BY from, to`,
      );

      return {
        topics: nodes.records.map((r) => ({
          id: r.get("id"),
          title: r.get("title"),
          tier: r.get("tier"),
          canonical: r.get("canonical") ?? false,
        })),
        edges: edges.records.map((r) => ({
          from: r.get("from"),
          to: r.get("to"),
          kind: r.get("kind"),
          weight: r.get("weight"),
        })),
      };
    });

    return NextResponse.json({ taxonomy: listTaxonomy(), live });
  } catch (err) {
    console.error("[neo4j/ontology][GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — re-runs ontology seeding without touching users/activities. Use
// after editing taxonomy.ts to push new edges into the live graph.
export async function POST() {
  try {
    const stats = await reseedOntology();
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[neo4j/ontology][POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
