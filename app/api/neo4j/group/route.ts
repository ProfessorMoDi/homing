import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import { leaveGroup, writeGroup, type WriteGroupPayload } from "../../../../lib/neo4j-writes";

export const runtime = "nodejs";
export const maxDuration = 15;

// POST   — create a RecurringGroup, attach BORN_FROM to the seed activity,
//          attach MEMBER_OF for each member user.
// DELETE — remove a single MEMBER_OF edge ({user_id, group_id}).

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as WriteGroupPayload | null;
  if (!body?.group_id || !body?.born_from_activity_id || !Array.isArray(body.member_user_ids)) {
    return NextResponse.json(
      { error: "group_id, born_from_activity_id, member_user_ids required" },
      { status: 400 },
    );
  }
  try {
    await withWrite((tx) => writeGroup(tx, body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[neo4j/group][POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { user_id?: string; group_id?: string } | null;
  if (!body?.user_id || !body?.group_id) {
    return NextResponse.json({ error: "user_id and group_id required" }, { status: 400 });
  }
  try {
    await withWrite((tx) => leaveGroup(tx, body.user_id!, body.group_id!));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[neo4j/group][DELETE]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
