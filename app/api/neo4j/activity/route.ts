import { NextRequest, NextResponse } from "next/server";
import { withWrite } from "../../../../lib/neo4j";
import { upsertActivity } from "../../../../lib/neo4j-seed";
import { canonicalizeNeighbourhood, canonicalizeTopic } from "../../../../lib/taxonomy";

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

    // Compute the canonicalisation deltas alongside so the dev panel can show
    // exactly what got transformed. We re-run the canonicalisers here (cheap,
    // pure functions) rather than threading data out of upsertActivity, to
    // keep the seed layer's signature unchanged.
    const topics = [
      ...(activity.specific_interest_tags ?? []).map((raw: string) => ({
        raw,
        tier: "specific" as const,
        ...canonicalizeTopic(raw),
      })),
      ...(activity.broader_interest_tags ?? []).map((raw: string) => ({
        raw,
        tier: "broader" as const,
        ...canonicalizeTopic(raw),
      })),
    ];
    const neighbourhood = {
      raw: activity.location_area ?? "",
      canonical: canonicalizeNeighbourhood(activity.location_area),
    };

    return NextResponse.json({
      ok: true,
      canonicalised: { topics, neighbourhood },
    });
  } catch (err) {
    console.error("[neo4j/activity]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
