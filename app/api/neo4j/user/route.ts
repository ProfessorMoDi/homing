import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import { patchUser, type UserPatch } from "../../../../lib/neo4j-writes";

export const runtime = "nodejs";
export const maxDuration = 15;

// Patch-style upsert: only the fields present in the payload are written,
// so debounced signup edits can flow in incrementally without clobbering
// prior state. The `demo: true` flag is sticky on the User node.

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as UserPatch | null;
  if (!body?.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    await withWrite((tx) => patchUser(tx, body));
    return NextResponse.json({ ok: true, id: body.id });
  } catch (err) {
    console.error("[neo4j/user]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
