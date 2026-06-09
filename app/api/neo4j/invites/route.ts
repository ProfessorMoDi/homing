import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import {
  patchInvite,
  writeInvites,
  type PatchInvitePayload,
  type WriteInvitesPayload,
} from "../../../../lib/neo4j-writes";

export const runtime = "nodejs";
export const maxDuration = 15;

// POST  — bulk create INVITED edges from one Activity to N Users.
//         Each edge starts in 'pending' status.
// PATCH — update one edge's status (accepted / declined / rescheduled / etc).

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as WriteInvitesPayload | null;
  if (!body?.activity_id) {
    return NextResponse.json(
      { error: "activity_id required" },
      { status: 400 },
    );
  }
  const hasIds =
    Array.isArray(body.invited_user_ids) && body.invited_user_ids.length > 0;
  const hasInvites = Array.isArray(body.invites) && body.invites.length > 0;
  if (!hasIds && !hasInvites) {
    return NextResponse.json(
      { error: "activity_id and invited_user_ids or invites required" },
      { status: 400 },
    );
  }
  try {
    const result = await withWrite((tx) => writeInvites(tx, body));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[neo4j/invites][POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as PatchInvitePayload | null;
  if (!body?.activity_id || !body?.invited_user_id || !body?.status) {
    return NextResponse.json(
      { error: "activity_id, invited_user_id, status required" },
      { status: 400 },
    );
  }
  try {
    await withWrite((tx) => patchInvite(tx, body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[neo4j/invites][PATCH]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
