import { type SeedUser, seedUsers } from "./data";
import type { GraphMatchCandidate } from "./neo4jClient";
import type { Activity } from "./types";

const seedById = new Map(seedUsers.map((u) => [u.id, u]));

function seedUserFromGraph(c: GraphMatchCandidate): SeedUser {
  const existing = seedById.get(c.user_id);
  if (existing) return existing;
  return {
    id: c.user_id,
    first_name: c.first_name,
    email: "",
    age: 0,
    gender: "prefer-not-to-say",
    gender_preference: "either",
    neighbourhood: c.neighbourhood || "",
    languages_spoken: [],
    languages_comfortable: [],
    availability: [],
    commitment_appetite: "try-once",
    verification_status: "verified",
    profile_completed: true,
    interests: [],
    voice_quote: "",
  };
}

/** Map Neo4j match response into UI MatchResult rows (seed profile when known). */
export function graphCandidatesToMatchResults(
  candidates: GraphMatchCandidate[],
): MatchResult[] {
  return candidates.map((c) => ({
    user: seedUserFromGraph(c),
    score: c.score,
    reasons: c.reasons?.length ? c.reasons : [],
    excluded: false,
  }));
}

/** Prefer graph-ranked candidates; fall back to local mock ranker when Neo4j is down. */
export function resolveMatchesForActivity(
  activity: Activity,
  graphCandidates: GraphMatchCandidate[] | null | undefined,
  excludeUserIds: string[] = [],
): MatchResult[] {
  if (graphCandidates !== null && graphCandidates !== undefined) {
    return graphCandidatesToMatchResults(graphCandidates).filter(
      (m) => !excludeUserIds.includes(m.user.id),
    );
  }
  return rankCandidatesForActivity(activity, excludeUserIds);
}

export interface MatchResult {
  user: SeedUser;
  score: number;
  reasons: string[];
  excluded?: boolean;
}

export function scoreUserForActivity(
  user: SeedUser,
  activity: Activity,
): MatchResult {
  const reasons: string[] = [];
  let score = 0;
  let excluded = false;

  const interests = user.interests.map((i) => i.toLowerCase());
  const specific = activity.specific_interest_tags.map((t) => t.toLowerCase());
  const broader = activity.broader_interest_tags.map((t) => t.toLowerCase());

  // 1. Specific interest match
  const specificHit = specific.some((t) =>
    interests.some((i) => i.includes(t) || t.includes(i)),
  );
  const broaderHit = broader.some((t) =>
    interests.some((i) => i.includes(t) || t.includes(i)),
  );

  if (specificHit) {
    score += 50;
    reasons.push(`Mentioned ${specific[0]}`);
  } else if (broaderHit) {
    score += 30;
    reasons.push(`Mentioned ${broader[0]}`);
  }

  // exclusion: explicit dislike (mocked via "running" only profile dislike etc.)
  if (
    user.id === "u_david" &&
    (specific.includes("catan") || broader.includes("board games"))
  ) {
    excluded = true;
    reasons.push("Mentioned not into board games");
    return { user, score: -100, reasons, excluded };
  }

  return { user, score, reasons, excluded };
}

export function rankCandidatesForActivity(
  activity: Activity,
  excludeUserIds: string[] = [],
): MatchResult[] {
  return seedUsers
    .filter((u) => !excludeUserIds.includes(u.id))
    .map((u) => scoreUserForActivity(u, activity))
    .sort((a, b) => b.score - a.score);
}

/**
 * The people who actually joined: invitees whose response is "accepted",
 * ordered by their match score. Falls back to the top-ranked candidates when
 * no responses exist yet (e.g. a page is opened directly in the demo) so the
 * details / chat / feedback screens always have a consistent group.
 */
export function getAcceptedParticipants(
  matches: MatchResult[],
  inviteResponses: Record<string, string>,
  minSize: number,
): MatchResult[] {
  const accepted = matches.filter(
    (m) => inviteResponses[m.user.id] === "accepted",
  );
  if (accepted.length > 0) return accepted;
  return matches.filter((m) => !m.excluded && m.score > 0).slice(0, Math.max(minSize, 3));
}

export const defaultCatanActivity: Activity = {
  id: "a_catan_thu",
  creator_user_id: "u_demo",
  title: "Start a Catan round",
  description: "One game of Catan, low-pressure, near campus.",
  activity_type: "one-off",
  specific_interest_tags: ["catan"],
  broader_interest_tags: ["board games", "strategy games"],
  day: "Thursday",
  time: "20:00",
  duration: "1.5 hours",
  location_area: "Near EUR campus",
  exact_venue: "Boardroom Café · Honingerdijk 12",
  group_size_target: 4,
  minimum_group_size: 3,
  language: "English",
  energy_level: "Low-pressure / structured",
  note: "Nothing serious, just one Catan game and see if it's fun.",
  status: "suggested",
};

export const photoWalkActivity: Activity = {
  id: "a_photo_sat",
  creator_user_id: "u_demo",
  title: "Casual photo walk",
  description: "Slow Saturday walk through Kralingen with cameras.",
  activity_type: "one-off",
  specific_interest_tags: ["photography"],
  broader_interest_tags: ["walks", "outdoors"],
  day: "Saturday",
  time: "14:00",
  duration: "90 minutes",
  location_area: "Kralingen",
  exact_venue: "Kralingse Plas, west entrance",
  group_size_target: 5,
  minimum_group_size: 3,
  language: "English",
  energy_level: "Relaxed",
  status: "suggested",
};

export const incomingInviteActivity: Activity = {
  id: "a_ttr_wed_in",
  creator_user_id: "u_sophie",
  title: "Ticket to Ride session",
  description: "A slow Wednesday game night. One round, see how it feels.",
  activity_type: "one-off",
  specific_interest_tags: ["ticket to ride"],
  broader_interest_tags: ["board games", "strategy games"],
  day: "Wednesday",
  time: "19:30",
  duration: "1.5 hours",
  location_area: "Kralingen · near campus",
  exact_venue: "Hidden until everyone verifies",
  group_size_target: 4,
  minimum_group_size: 3,
  language: "English",
  energy_level: "Low-pressure / structured",
  status: "inviting",
};

export const musicActivity: Activity = {
  id: "a_music_fri",
  creator_user_id: "u_demo",
  title: "Music production mini-session",
  description: "Bring a laptop or just listen. Learn a thing or two together.",
  activity_type: "one-off",
  specific_interest_tags: ["music production", "techno"],
  broader_interest_tags: ["music"],
  day: "Friday",
  time: "14:00",
  duration: "2 hours",
  location_area: "Delfshaven",
  exact_venue: "WORM Sound Studio",
  group_size_target: 4,
  minimum_group_size: 3,
  language: "English",
  energy_level: "Creative",
  status: "suggested",
};
