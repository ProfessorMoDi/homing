import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  try {
    const { runSchemaMigration, seedDatabase } = await import("../../../../lib/neo4j-seed");
    await runSchemaMigration();
    const result = await seedDatabase();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[neo4j/seed]", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
