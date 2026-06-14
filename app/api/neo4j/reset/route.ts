import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import { runSchemaMigration, seedFoundations } from "../../../../lib/neo4j-seed";

export const runtime = "nodejs";
export const maxDuration = 30;

// DESTRUCTIVE — wipes every node and relationship, then rebuilds schema +
// lookups + the topic ontology with NO users. Used to reset the live graph
// for the friends beta so real signups fill a clean, ontology-backed graph
// (no fictional seed users, no leftover demo data).
//
// Constraints/indexes survive a `DETACH DELETE` node wipe, and
// runSchemaMigration is idempotent, so this is safe to run repeatedly.
//
// Guarded by a confirmation token so it can't fire by accident; the caller
// must POST { confirm: "RESET" }.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.confirm !== "RESET") {
    return NextResponse.json(
      { error: 'Confirmation required: POST { "confirm": "RESET" }' },
      { status: 400 },
    );
  }

  try {
    const deleted = await withWrite(async (tx) => {
      const r = await tx.run(`MATCH (n) RETURN count(n) AS c`);
      await tx.run(`MATCH (n) DETACH DELETE n`);
      return toNumber(r.records[0]?.get("c"));
    });

    await runSchemaMigration();
    const foundations = await seedFoundations();

    return NextResponse.json({ ok: true, nodes_deleted: deleted, ...foundations });
  } catch (err) {
    console.error("[neo4j/reset]", err);
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
