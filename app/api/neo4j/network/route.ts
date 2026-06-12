import { NextResponse } from "next/server";
import { withRead } from "../../../../lib/neo4j";

export const runtime = "nodejs";
export const maxDuration = 15;

// Operator view of the live beta network (real members only — demo-tagged
// nodes excluded). Built for the friends-beta phase: the operator needs to
// see who joined, what they're into, and who overlaps with whom, so they can
// personally ping people when a match appears. This is an operator surface —
// it shows first names and interests, so don't expose it in the public app.

interface RecentMember {
  id: string;
  name: string;
  neighbourhood: string;
  updated_at: string | null;
  interests: string[];
  best_overlap: { name: string; shared: string[] } | null;
}

interface FirstInNetwork {
  topic: string;
  member: string;
}

export async function GET() {
  try {
    const data = await withRead(async (tx) => {
      const statsRes = await tx.run(
        `MATCH (u:User)
         WHERE coalesce(u.demo, false) = false AND u.first_name IS NOT NULL
         OPTIONAL MATCH (u)-[:RECORDED]->(v:VoiceProfile)
         RETURN count(DISTINCT u) AS members, count(DISTINCT v) AS voices`,
      );

      const topicsRes = await tx.run(
        `MATCH (t:Topic)<-[l:LIKES]-(u:User)
         WHERE coalesce(u.demo, false) = false AND coalesce(l.weight, 1) > 0
         RETURN count(DISTINCT t) AS liked_topics,
                count(l) AS likes,
                sum(CASE WHEN coalesce(t.canonical, false) THEN 0 ELSE 1 END)
                  AS long_tail_likes`,
      );

      const recentRes = await tx.run(
        `MATCH (u:User)
         WHERE coalesce(u.demo, false) = false AND u.first_name IS NOT NULL
         WITH u ORDER BY u.updated_at DESC LIMIT 8
         OPTIONAL MATCH (u)-[l:LIKES]->(t:Topic)
           WHERE coalesce(l.weight, 1) > 0
         WITH u, collect(t.title) AS interests
         OPTIONAL MATCH (u)-[l1:LIKES]->(st:Topic)<-[l2:LIKES]-(o:User)
           WHERE o.id <> u.id
             AND coalesce(o.demo, false) = false AND o.first_name IS NOT NULL
             // friends-beta heuristic: same first name = likely the same
             // person testing twice; don't suggest pinging them about
             // themselves
             AND o.first_name <> u.first_name
             AND coalesce(l1.weight, 1) > 0 AND coalesce(l2.weight, 1) > 0
         WITH u, interests, o, collect(DISTINCT st.title) AS shared
         ORDER BY size(shared) DESC
         WITH u, interests,
              collect({name: o.first_name, shared: shared})[0] AS best
         RETURN u.id AS id, u.first_name AS name,
                u.neighbourhood AS neighbourhood,
                u.updated_at AS updated_at,
                interests, best
         ORDER BY updated_at DESC`,
      );

      // Interests only one member has — the "waiting for a match" list. When
      // a new joiner overlaps one of these, that's the moment to ping both.
      const firstRes = await tx.run(
        `MATCH (t:Topic)<-[l:LIKES]-(u:User)
         WHERE coalesce(u.demo, false) = false AND u.first_name IS NOT NULL
           AND coalesce(l.weight, 1) > 0
         WITH t, collect(DISTINCT u.first_name) AS likers
         WHERE size(likers) = 1
         RETURN t.title AS topic, likers[0] AS member
         ORDER BY toLower(t.title) LIMIT 24`,
      );

      return { statsRes, topicsRes, recentRes, firstRes };
    });

    const s = data.statsRes.records[0];
    const t = data.topicsRes.records[0];

    const recent: RecentMember[] = data.recentRes.records.map((r) => {
      const best = r.get("best") as { name?: string; shared?: string[] } | null;
      return {
        id: r.get("id") as string,
        name: r.get("name") as string,
        neighbourhood: (r.get("neighbourhood") as string) ?? "",
        updated_at: (r.get("updated_at") as string) ?? null,
        interests: ((r.get("interests") as string[]) ?? []).filter(Boolean),
        best_overlap:
          best?.name && (best.shared?.length ?? 0) > 0
            ? { name: best.name, shared: best.shared!.filter(Boolean) }
            : null,
      };
    });

    const first_in_network: FirstInNetwork[] = data.firstRes.records.map(
      (r) => ({
        topic: r.get("topic") as string,
        member: r.get("member") as string,
      }),
    );

    return NextResponse.json({
      stats: {
        members: toNumber(s?.get("members")),
        voice_profiles: toNumber(s?.get("voices")),
        liked_topics: toNumber(t?.get("liked_topics")),
        likes: toNumber(t?.get("likes")),
        long_tail_likes: toNumber(t?.get("long_tail_likes")),
      },
      recent,
      first_in_network,
    });
  } catch (err) {
    console.error("[neo4j/network]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as { toNumber?: () => number }).toNumber === "function")
    return (v as { toNumber: () => number }).toNumber();
  return Number(v) || 0;
}
