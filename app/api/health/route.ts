import { NextResponse } from "next/server";
import { withRead } from "../../../lib/neo4j";

export const runtime = "nodejs";
export const maxDuration = 15;

// Lightweight health check, also used as a keep-alive: AuraDB Free auto-pauses
// after ~3 days idle, which would silently drop collect signups. A daily cron
// (see vercel.json) pings this so the friends link never lands on a cold graph.
export async function GET() {
  try {
    await withRead((tx) => tx.run("RETURN 1 AS ok"));
    return NextResponse.json({ ok: true, neo4j: "up" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, neo4j: "down", error: String(err) },
      { status: 503 },
    );
  }
}
