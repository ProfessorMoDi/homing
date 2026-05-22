import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import { upsertActivity } from "../../../../lib/neo4j-seed";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const activity = await req.json().catch(() => null);
  if (!activity?.id || !activity?.creator_user_id) {
    return NextResponse.json(
      { error: "activity.id and creator_user_id required" },
      { status: 400 },
    );
  }

  try {
    await withWrite((tx) => upsertActivity(tx, activity));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[neo4j/activity]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
