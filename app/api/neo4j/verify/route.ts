import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import { writeVerify, type VerifyPayload } from "../../../../lib/neo4j-writes";

export const runtime = "nodejs";
export const maxDuration = 15;

// Mark a User verified and write a VERIFIED_VIA edge to the activity that
// triggered the verification.

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as VerifyPayload | null;
  if (!body?.user_id) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }
  try {
    await withWrite((tx) => writeVerify(tx, body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[neo4j/verify]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
