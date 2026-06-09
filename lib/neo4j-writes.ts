// Cypher write helpers for the new graph-ready mutations. Sibling of
// lib/neo4j-seed.ts — that file owns initial schema + seed users; this one
// owns the live-flow mutations (patch user, voice profile, interests,
// invites, verify, feedback rating, group). All helpers run inside a
// `withWrite` transaction.

import type { ManagedTransaction } from "neo4j-driver";
import { canonicalizeNeighbourhood, canonicalizeTopic } from "./taxonomy";

// ── User patch ───────────────────────────────────────────────────────────
// Patch-style upsert. Only writes the fields actually present in the patch
// so debounced signup-edit calls don't blow away previously-set state.
// `demo` flag is sticky: once true, stays true.

export interface UserPatch {
  id: string;
  demo?: boolean;
  first_name?: string;
  email?: string;
  age?: number | null;
  gender?: string;
  gender_preference?: string;
  neighbourhood?: string;
  postcode?: string;
  language_other?: string;
  commitment_appetite?: string;
  verification_status?: string;
  profile_completed?: boolean;
  languages_spoken?: string[];
  languages_comfortable?: string[];
  availability?: string[];
  interests?: string[];
}

export async function patchUser(
  tx: ManagedTransaction,
  patch: UserPatch,
): Promise<void> {
  if (!patch.id) throw new Error("patchUser requires id");

  const now = new Date().toISOString();
  const fieldsToSet: Record<string, unknown> = { updated_at: now };

  const stringFields: Array<keyof UserPatch> = [
    "first_name", "email", "gender", "gender_preference",
    "postcode", "language_other", "commitment_appetite",
    "verification_status",
  ];
  for (const k of stringFields) {
    const v = patch[k];
    if (typeof v === "string" && v.trim().length > 0) {
      fieldsToSet[k] = v;
    }
  }
  if (typeof patch.age === "number") fieldsToSet.age = patch.age;
  if (typeof patch.profile_completed === "boolean") {
    fieldsToSet.profile_completed = patch.profile_completed;
  }
  if (patch.neighbourhood !== undefined && patch.neighbourhood.length > 0) {
    fieldsToSet.neighbourhood = canonicalizeNeighbourhood(patch.neighbourhood);
  }

  // Build the SET clause dynamically.
  const setExprs = Object.keys(fieldsToSet).map((k) => `u.${k} = $${k}`);
  // Demo flag — apply on create only; never overwrite an existing User's
  // flag with a demo=true write (we want real-user nodes to stay real).
  const demoClause = patch.demo === true ? ", u.demo = coalesce(u.demo, true)" : "";

  await tx.run(
    `MERGE (u:User {id: $id})
     SET ${setExprs.join(", ")}${demoClause}`,
    { id: patch.id, ...fieldsToSet },
  );

  // Edge replacements — only fire when the patch explicitly includes the
  // array (undefined = "no opinion, leave alone"; [] = "clear everything").
  if (patch.availability !== undefined) {
    await tx.run(
      `MATCH (u:User {id: $id})-[r:AVAILABLE_AT]->(:TimeSlot) DELETE r`,
      { id: patch.id },
    );
    for (const slot of patch.availability) {
      await tx.run(
        `MATCH (u:User {id: $uid}), (ts:TimeSlot {id: $tsId})
         MERGE (u)-[:AVAILABLE_AT]->(ts)`,
        { uid: patch.id, tsId: slot },
      );
    }
  }

  if (patch.languages_spoken !== undefined || patch.languages_comfortable !== undefined) {
    await tx.run(
      `MATCH (u:User {id: $id})-[r:SPEAKS|COMFORTABLE_IN]->(:Language) DELETE r`,
      { id: patch.id },
    );
    for (const lang of patch.languages_spoken ?? []) {
      await tx.run(
        `MATCH (u:User {id: $uid}), (l:Language {id: $lid})
         MERGE (u)-[:SPEAKS]->(l)`,
        { uid: patch.id, lid: lang.toLowerCase() },
      );
    }
    for (const lang of patch.languages_comfortable ?? []) {
      await tx.run(
        `MATCH (u:User {id: $uid}), (l:Language {id: $lid})
         MERGE (u)-[:COMFORTABLE_IN]->(l)`,
        { uid: patch.id, lid: lang.toLowerCase() },
      );
    }
  }

  // LIKES are handled by writeInterests separately — patchUser leaves them
  // alone unless the legacy `interests` array is provided (seed-style).
  if (patch.interests !== undefined) {
    await writeInterests(tx, {
      user_id: patch.id,
      demo: patch.demo === true,
      topics: patch.interests.map((t) => ({ title: t, source: "seed" })),
    });
  }
}

// ── Interests ─────────────────────────────────────────────────────────────
// Bulk replace of a user's LIKES edges, server-canonicalised.

export interface InterestTopic {
  title: string;
  weight?: number;
  source?: "voice-analysis" | "signup" | "edited" | "seed";
  hidden?: boolean;
}

export interface WriteInterestsPayload {
  user_id: string;
  demo?: boolean;
  topics: InterestTopic[];
}

export async function writeInterests(
  tx: ManagedTransaction,
  payload: WriteInterestsPayload,
): Promise<{ written: number; skipped: number }> {
  const now = new Date().toISOString();
  let written = 0;
  let skipped = 0;

  await tx.run(
    `MATCH (u:User {id: $id})-[r:LIKES]->(:Topic) DELETE r`,
    { id: payload.user_id },
  );

  for (const t of payload.topics) {
    const { id: topicId, title, canonical } = canonicalizeTopic(t.title);
    if (!topicId) {
      skipped++;
      continue;
    }
    const weight = t.hidden ? 0 : (typeof t.weight === "number" ? t.weight : 1.0);
    const source = t.source ?? "voice-analysis";
    await tx.run(
      `MERGE (top:Topic {id: $topicId})
         ON CREATE SET top.title = $title, top.tier = 'specific', top.canonical = $canonical
         ON MATCH  SET top.title = coalesce(top.title, $title)
       WITH top
       MATCH (u:User {id: $userId})
       MERGE (u)-[r:LIKES]->(top)
         SET r.weight = $weight,
             r.source = $source,
             r.updated_at = $now${payload.demo ? ", r.demo = true" : ""}`,
      { topicId, title, canonical, userId: payload.user_id, weight, source, now },
    );
    written++;
  }

  return { written, skipped };
}

// ── Voice profile ─────────────────────────────────────────────────────────

export interface VoiceProfilePayload {
  user_id: string;
  transcript: string;
  source?: "live" | "sample";
  language?: string;
  demo?: boolean;
}

export async function writeVoiceProfile(
  tx: ManagedTransaction,
  p: VoiceProfilePayload,
): Promise<{ voice_id: string }> {
  const voiceId = `voice_${p.user_id}`;
  const now = new Date().toISOString();

  // 1:1 — replace any existing VoiceProfile for this user.
  await tx.run(
    `MATCH (u:User {id: $userId})-[r:RECORDED]->(old:VoiceProfile) DETACH DELETE old`,
    { userId: p.user_id },
  );

  await tx.run(
    `MERGE (v:VoiceProfile {id: $voiceId})
       SET v.transcript  = $transcript,
           v.source      = $source,
           v.language    = $language,
           v.recorded_at = $now,
           v.user_id     = $userId${p.demo ? ", v.demo = true" : ""}
     WITH v
     MATCH (u:User {id: $userId})
     MERGE (u)-[r:RECORDED]->(v)
       SET r.recorded_at = $now${p.demo ? ", r.demo = true" : ""}`,
    {
      voiceId,
      userId: p.user_id,
      transcript: p.transcript,
      source: p.source ?? "live",
      language: p.language ?? "en",
      now,
    },
  );

  return { voice_id: voiceId };
}

// ── Invites ───────────────────────────────────────────────────────────────

export type InviteStatus =
  | "pending" | "accepted" | "declined" | "rescheduled" | "timed_out";

export interface InviteWriteEntry {
  user_id: string;
  match_score?: number;
  match_reasons?: string[];
}

export interface WriteInvitesPayload {
  activity_id: string;
  invited_user_ids?: string[];
  invites?: InviteWriteEntry[];
  demo?: boolean;
}

export async function writeInvites(
  tx: ManagedTransaction,
  p: WriteInvitesPayload,
): Promise<{ written: number }> {
  const now = new Date().toISOString();
  const entries: InviteWriteEntry[] =
    p.invites ??
    (p.invited_user_ids ?? []).map((user_id) => ({ user_id }));

  let written = 0;
  for (const entry of entries) {
    const score = entry.match_score ?? 0;
    const reasons = entry.match_reasons ?? [];
    await tx.run(
      `MATCH (a:Activity {id: $aid}), (u:User {id: $uid})
       MERGE (a)-[r:INVITED]->(u)
         ON CREATE SET r.status = 'pending', r.invited_at = $now,
           r.match_score = $score, r.match_reasons = $reasons${p.demo ? ", r.demo = true" : ""}
         ON MATCH  SET r.invited_at = coalesce(r.invited_at, $now),
           r.match_score = $score, r.match_reasons = $reasons`,
      {
        aid: p.activity_id,
        uid: entry.user_id,
        now,
        score,
        reasons,
      },
    );
    written++;
  }
  return { written };
}

export interface PatchInvitePayload {
  activity_id: string;
  invited_user_id: string;
  status: InviteStatus;
  suggested_time?: string;
  demo?: boolean;
}

export async function patchInvite(
  tx: ManagedTransaction,
  p: PatchInvitePayload,
): Promise<void> {
  const now = new Date().toISOString();
  const suggestedClause = p.suggested_time
    ? ", r.suggested_time = $suggestedTime"
    : "";
  await tx.run(
    `MATCH (a:Activity {id: $aid})-[r:INVITED]->(u:User {id: $uid})
     SET r.status = $status,
         r.responded_at = $now${suggestedClause}${p.demo ? ", r.demo = true" : ""}`,
    {
      aid: p.activity_id, uid: p.invited_user_id,
      status: p.status, now,
      suggestedTime: p.suggested_time ?? null,
    },
  );
}

// ── Verify ────────────────────────────────────────────────────────────────

export interface VerifyPayload {
  user_id: string;
  activity_id?: string;
  method?: "idin" | "id_selfie" | "simulated";
  demo?: boolean;
}

export async function writeVerify(
  tx: ManagedTransaction,
  p: VerifyPayload,
): Promise<void> {
  const now = new Date().toISOString();

  await tx.run(
    `MATCH (u:User {id: $userId})
     SET u.verification_status = 'verified',
         u.verified_at = $now`,
    { userId: p.user_id, now },
  );

  if (p.activity_id) {
    await tx.run(
      `MATCH (u:User {id: $userId}), (a:Activity {id: $aid})
       MERGE (u)-[r:VERIFIED_VIA]->(a)
         SET r.method = $method,
             r.verified_at = $now${p.demo ? ", r.demo = true" : ""}`,
      {
        userId: p.user_id,
        aid: p.activity_id,
        method: p.method ?? "simulated",
        now,
      },
    );
  }
}

// ── Rated edge (extends feedback) ────────────────────────────────────────

export interface RatedPayload {
  user_id: string;
  activity_id: string;
  rating?: number;
  event_note?: string;
  demo?: boolean;
}

export async function writeRated(
  tx: ManagedTransaction,
  p: RatedPayload,
): Promise<void> {
  if (typeof p.rating !== "number" && !p.event_note) return;
  const now = new Date().toISOString();
  await tx.run(
    `MATCH (u:User {id: $userId}), (a:Activity {id: $aid})
     MERGE (u)-[r:RATED]->(a)
       SET r.rating     = coalesce($rating, r.rating),
           r.event_note = coalesce($note, r.event_note),
           r.rated_at   = $now${p.demo ? ", r.demo = true" : ""}`,
    {
      userId: p.user_id, aid: p.activity_id,
      rating: typeof p.rating === "number" ? p.rating : null,
      note: p.event_note ?? null,
      now,
    },
  );
}

// ── Recurring group ──────────────────────────────────────────────────────

export interface WriteGroupPayload {
  group_id: string;
  name: string;
  theme: string;
  rhythm: string;
  born_from_activity_id: string;
  member_user_ids: string[];
  demo?: boolean;
}

export async function writeGroup(
  tx: ManagedTransaction,
  p: WriteGroupPayload,
): Promise<void> {
  const now = new Date().toISOString();

  await tx.run(
    `MERGE (g:RecurringGroup {id: $gid})
       SET g.name = $name, g.theme = $theme, g.rhythm = $rhythm,
           g.status = 'active', g.created_at = coalesce(g.created_at, $now)${p.demo ? ", g.demo = true" : ""}
     WITH g
     MATCH (a:Activity {id: $aid})
     MERGE (g)-[r:BORN_FROM]->(a)${p.demo ? " SET r.demo = true" : ""}`,
    { gid: p.group_id, name: p.name, theme: p.theme, rhythm: p.rhythm,
      aid: p.born_from_activity_id, now },
  );

  for (const userId of p.member_user_ids) {
    await tx.run(
      `MATCH (u:User {id: $uid}), (g:RecurringGroup {id: $gid})
       MERGE (u)-[r:MEMBER_OF]->(g)
         ON CREATE SET r.joined_at = $now${p.demo ? ", r.demo = true" : ""}`,
      { uid: userId, gid: p.group_id, now },
    );
  }
}

export async function leaveGroup(
  tx: ManagedTransaction,
  user_id: string,
  group_id: string,
): Promise<void> {
  await tx.run(
    `MATCH (u:User {id: $uid})-[r:MEMBER_OF]->(g:RecurringGroup {id: $gid}) DELETE r`,
    { uid: user_id, gid: group_id },
  );
}
