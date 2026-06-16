import { NextRequest, NextResponse } from "next/server";
import { withRead, withWrite } from "../../../../lib/neo4j";
import { patchUser, type UserPatch } from "../../../../lib/neo4j-writes";
import { requireOwner } from "../../../../lib/authGuard";

export const runtime = "nodejs";
export const maxDuration = 15;

// GET ?id=u_<slug> — load a returning user's stored data so a sign-in can skip
// onboarding and land on the events page already populated. Returns the
// profile, their interest titles (LIKES weight>0), availability/languages, and
// the activities they created (tags reconstructed from REQUIRES edges). Read
// only; `exists:false` when there's no User node.

function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof (v as { toNumber?: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // This returns personal data (name, postcode, age, interests), so the caller
  // must prove — via a verified Firebase ID token — that they ARE this user.
  // Fails closed: no/invalid token or unconfigured Admin SDK → reject.
  const auth = await requireOwner(req, id);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 403 ? "forbidden" : "unauthorized" },
      { status: auth.status },
    );
  }

  try {
    const data = await withRead(async (tx) => {
      const userRes = await tx.run(
        `MATCH (u:User {id: $id})
         OPTIONAL MATCH (u)-[:AVAILABLE_AT]->(ts:TimeSlot)
         OPTIONAL MATCH (u)-[:COMFORTABLE_IN]->(lc:Language)
         OPTIONAL MATCH (u)-[:SPEAKS]->(ls:Language)
         OPTIONAL MATCH (u)-[lk:LIKES]->(t:Topic) WHERE coalesce(lk.weight, 1) > 0
         RETURN u AS user,
                collect(DISTINCT ts.id)   AS availability,
                collect(DISTINCT lc.id)   AS languages_comfortable,
                collect(DISTINCT ls.id)   AS languages_spoken,
                collect(DISTINCT t.title) AS topics`,
        { id },
      );
      if (userRes.records.length === 0 || !userRes.records[0].get("user")) {
        return { exists: false as const };
      }
      const rec = userRes.records[0];
      const u = (rec.get("user") as { properties: Record<string, unknown> }).properties;

      const actRes = await tx.run(
        `MATCH (u:User {id: $id})<-[:CREATED_BY]-(a:Activity)
         OPTIONAL MATCH (a)-[req:REQUIRES]->(t:Topic)
         WITH a, req.tier AS tier, t.title AS title
         WITH a,
              collect(CASE WHEN tier = 'specific' THEN title END) AS spec,
              collect(CASE WHEN tier = 'broader'  THEN title END) AS broad
         RETURN a AS activity,
                [x IN spec  WHERE x IS NOT NULL] AS specific_interest_tags,
                [x IN broad WHERE x IS NOT NULL] AS broader_interest_tags
         ORDER BY a.updated_at DESC`,
        { id },
      );
      const activities = actRes.records.map((r) => {
        const a = (r.get("activity") as { properties: Record<string, unknown> }).properties;
        return {
          ...a,
          group_size_target: toNum(a.group_size_target) ?? 4,
          minimum_group_size: toNum(a.minimum_group_size) ?? 3,
          specific_interest_tags: r.get("specific_interest_tags") as string[],
          broader_interest_tags: r.get("broader_interest_tags") as string[],
        };
      });

      return {
        exists: true as const,
        profile: {
          first_name: (u.first_name as string) ?? "",
          last_name: (u.last_name as string) ?? "",
          gender: (u.gender as string) ?? "",
          postcode: (u.postcode as string) ?? "",
          neighbourhood: (u.neighbourhood as string) ?? "",
          commitment: (u.commitment_appetite as string) ?? "",
          age: toNum(u.age),
          profile_completed: u.profile_completed === true,
          availability: (rec.get("availability") as string[]).filter(Boolean),
          languages_comfortable: (rec.get("languages_comfortable") as string[]).filter(Boolean),
          languages_spoken: (rec.get("languages_spoken") as string[]).filter(Boolean),
        },
        topics: (rec.get("topics") as string[]).filter(Boolean),
        activities,
      };
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[neo4j/user][GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

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
