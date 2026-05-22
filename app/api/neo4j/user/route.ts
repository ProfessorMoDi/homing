import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import { upsertUser } from "../../../../lib/neo4j-seed";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const user = await req.json().catch(() => null);
  if (!user?.id) {
    return NextResponse.json({ error: "user.id required" }, { status: 400 });
  }

  try {
    await withWrite((tx) => upsertUser(tx, user));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[neo4j/user]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
