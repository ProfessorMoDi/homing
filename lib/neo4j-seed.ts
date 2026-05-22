import type { ManagedTransaction } from "neo4j-driver";
import { withWrite, withSession } from "./neo4j";
import { seedUsers, type SeedUser } from "./data";
import type { Activity } from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  { id: "every-weekend",    label: "Every Weekend" },
  { id: "weekday-evenings", label: "Weekday Evenings" },
  { id: "thursday-evening", label: "Thursday Evening" },
  { id: "friday-morning",   label: "Friday Morning" },
  { id: "flexible",         label: "Flexible" },
];

const LANGUAGES = [
  "English", "Dutch", "German", "French", "Spanish", "Arabic",
];

// ── Schema migration (idempotent) ─────────────────────────────────────────────

const SCHEMA_STATEMENTS = [
  `CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE`,
  `CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE`,
  `CREATE CONSTRAINT activity_id_unique IF NOT EXISTS FOR (a:Activity) REQUIRE a.id IS UNIQUE`,
  `CREATE CONSTRAINT topic_id_unique IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE`,
  `CREATE CONSTRAINT timeslot_id_unique IF NOT EXISTS FOR (ts:TimeSlot) REQUIRE ts.id IS UNIQUE`,
  `CREATE CONSTRAINT language_id_unique IF NOT EXISTS FOR (l:Language) REQUIRE l.id IS UNIQUE`,
  `CREATE CONSTRAINT group_id_unique IF NOT EXISTS FOR (g:RecurringGroup) REQUIRE g.id IS UNIQUE`,
  `CREATE INDEX activity_status IF NOT EXISTS FOR (a:Activity) ON (a.status)`,
  `CREATE INDEX user_neighbourhood IF NOT EXISTS FOR (u:User) ON (u.neighbourhood)`,
  `CREATE INDEX user_neighbourhood_commitment IF NOT EXISTS FOR (u:User) ON (u.neighbourhood, u.commitment_appetite)`,
];

export async function runSchemaMigration(): Promise<void> {
  await withSession(async (session) => {
    for (const stmt of SCHEMA_STATEMENTS) {
      await session.run(stmt);
    }
  });
}

// ── Seed all 12 users + lookups ───────────────────────────────────────────────

export async function seedDatabase(): Promise<{ users: number; topics: number }> {
  await withWrite(async (tx) => {
    for (const ts of TIME_SLOTS) {
      await tx.run(`MERGE (ts:TimeSlot {id: $id}) SET ts.label = $label`, ts);
    }
    for (const lang of LANGUAGES) {
      await tx.run(
        `MERGE (l:Language {id: $id}) SET l.name = $name`,
        { id: lang.toLowerCase(), name: lang },
      );
    }
  });

  for (const user of seedUsers) {
    await withWrite((tx) => upsertUser(tx, user));
  }

  const r = await withSession((s) => s.run(`MATCH (t:Topic) RETURN count(t) AS c`));
  const topics = (r.records[0].get("c") as { toNumber(): number }).toNumber();

  return { users: seedUsers.length, topics };
}

// ── User upsert ───────────────────────────────────────────────────────────────
// Full replace: rebuilds all LIKES / AVAILABLE_AT / SPEAKS / COMFORTABLE_IN
// edges from the current state of the user object.

export async function upsertUser(tx: ManagedTransaction, user: SeedUser): Promise<void> {
  const now = new Date().toISOString();

  await tx.run(
    `MERGE (u:User {id: $id})
     SET u.first_name          = $first_name,
         u.email               = $email,
         u.age                 = $age,
         u.gender              = $gender,
         u.gender_preference   = $gender_preference,
         u.neighbourhood       = $neighbourhood,
         u.commitment_appetite = $commitment_appetite,
         u.verification_status = $verification_status,
         u.profile_completed   = $profile_completed,
         u.updated_at          = $updated_at`,
    { ...user, updated_at: now },
  );

  // Replace LIKES / DISLIKES
  await tx.run(
    `MATCH (u:User {id: $id})-[r:LIKES|DISLIKES]->(:Topic) DELETE r`,
    { id: user.id },
  );
  for (const interest of user.interests) {
    const topicId = slugify(interest);
    await tx.run(
      `MERGE (t:Topic {id: $topicId})
         ON CREATE SET t.title = $title, t.tier = 'specific'
       WITH t
       MATCH (u:User {id: $userId})
       MERGE (u)-[:LIKES {weight: 1.0}]->(t)`,
      { topicId, title: interest, userId: user.id },
    );
  }

  // Replace AVAILABLE_AT
  await tx.run(
    `MATCH (u:User {id: $id})-[r:AVAILABLE_AT]->(:TimeSlot) DELETE r`,
    { id: user.id },
  );
  for (const slot of user.availability) {
    await tx.run(
      `MATCH (u:User {id: $uid}), (ts:TimeSlot {id: $tsId})
       MERGE (u)-[:AVAILABLE_AT]->(ts)`,
      { uid: user.id, tsId: slot },
    );
  }

  // Replace SPEAKS / COMFORTABLE_IN
  await tx.run(
    `MATCH (u:User {id: $id})-[r:SPEAKS|COMFORTABLE_IN]->(:Language) DELETE r`,
    { id: user.id },
  );
  for (const lang of user.languages_spoken) {
    await tx.run(
      `MATCH (u:User {id: $uid}), (l:Language {id: $lid})
       MERGE (u)-[:SPEAKS]->(l)`,
      { uid: user.id, lid: lang.toLowerCase() },
    );
  }
  for (const lang of user.languages_comfortable) {
    await tx.run(
      `MATCH (u:User {id: $uid}), (l:Language {id: $lid})
       MERGE (u)-[:COMFORTABLE_IN]->(l)`,
      { uid: user.id, lid: lang.toLowerCase() },
    );
  }
}

// ── Activity upsert ───────────────────────────────────────────────────────────

export async function upsertActivity(tx: ManagedTransaction, activity: Activity): Promise<void> {
  const now = new Date().toISOString();

  await tx.run(
    `MERGE (a:Activity {id: $id})
     SET a.creator_user_id    = $creator_user_id,
         a.title              = $title,
         a.description        = $description,
         a.activity_type      = $activity_type,
         a.day                = $day,
         a.time               = $time,
         a.duration           = $duration,
         a.location_area      = $location_area,
         a.exact_venue        = $exact_venue,
         a.group_size_target  = $group_size_target,
         a.minimum_group_size = $minimum_group_size,
         a.language           = $language,
         a.energy_level       = $energy_level,
         a.note               = $note,
         a.status             = $status,
         a.updated_at         = $updated_at`,
    { ...activity, note: activity.note ?? "", updated_at: now },
  );

  await tx.run(
    `MATCH (a:Activity {id: $aid}), (u:User {id: $uid})
     MERGE (a)-[:CREATED_BY]->(u)`,
    { aid: activity.id, uid: activity.creator_user_id },
  );

  // Rebuild REQUIRES
  await tx.run(
    `MATCH (a:Activity {id: $id})-[r:REQUIRES]->(:Topic) DELETE r`,
    { id: activity.id },
  );
  for (const tag of activity.specific_interest_tags) {
    const topicId = slugify(tag);
    await tx.run(
      `MERGE (t:Topic {id: $topicId}) ON CREATE SET t.title = $title, t.tier = 'specific'
       WITH t MATCH (a:Activity {id: $aid})
       MERGE (a)-[:REQUIRES {tier: 'specific'}]->(t)`,
      { topicId, title: tag, aid: activity.id },
    );
  }
  for (const tag of activity.broader_interest_tags) {
    const topicId = slugify(tag);
    await tx.run(
      `MERGE (t:Topic {id: $topicId}) ON CREATE SET t.title = $title, t.tier = 'broader'
       WITH t MATCH (a:Activity {id: $aid})
       MERGE (a)-[:REQUIRES {tier: 'broader'}]->(t)`,
      { topicId, title: tag, aid: activity.id },
    );
  }

  // Rebuild SCHEDULED_AT
  await tx.run(
    `MATCH (a:Activity {id: $id})-[r:SCHEDULED_AT]->(:TimeSlot) DELETE r`,
    { id: activity.id },
  );
  for (const slotId of deriveTimeSlots(activity.day, activity.time)) {
    await tx.run(
      `MATCH (a:Activity {id: $aid}), (ts:TimeSlot {id: $tsId})
       MERGE (a)-[:SCHEDULED_AT]->(ts)`,
      { aid: activity.id, tsId: slotId },
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function deriveTimeSlots(day: string, time: string): string[] {
  const d = day.toLowerCase();
  const t = time.toLowerCase();
  const slots: string[] = [];

  if (d.includes("thursday")) slots.push("thursday-evening");
  if (d.includes("friday") && /morning|am|^0[0-9]:|^1[0-3]:/.test(t))
    slots.push("friday-morning");
  if (d.includes("saturday") || d.includes("sunday"))
    slots.push("every-weekend");
  if (/monday|tuesday|wednesday|thursday/.test(d))
    slots.push("weekday-evenings");

  return slots.length > 0 ? slots : ["flexible"];
}
