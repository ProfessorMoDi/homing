import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import { writeInterests, type WriteInterestsPayload } from "../../../../lib/neo4j-writes";

export const runtime = "nodejs";
export const maxDuration = 15;

// Bulk replace a user's LIKES edges. The server runs canonicalizeTopic on
// each title so client-side topic strings don't have to know the canonical
// form. Returns counts of how many landed vs were skipped.

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as WriteInterestsPayload | null;
  if (!body?.user_id || !Array.isArray(body.topics)) {
    return NextResponse.json(
      { error: "user_id and topics required" },
      { status: 400 },
    );
  }

  try {
    const result = await withWrite((tx) => writeInterests(tx, body));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[neo4j/interests]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
