import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import { writeVoiceProfile, type VoiceProfilePayload } from "../../../../lib/neo4j-writes";

export const runtime = "nodejs";
export const maxDuration = 15;

// Persist the user's recorded transcript as a VoiceProfile node and attach
// it to the User via :RECORDED. 1:1 — re-recording replaces the prior
// voice profile rather than accumulating.

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as VoiceProfilePayload | null;
  if (!body?.user_id || typeof body.transcript !== "string" || body.transcript.length === 0) {
    return NextResponse.json(
      { error: "user_id and transcript required" },
      { status: 400 },
    );
  }

  try {
    const result = await withWrite((tx) => writeVoiceProfile(tx, body));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[neo4j/voice]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
