"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Activity, Topic } from "./types";
import {
  defaultCatanActivity,
  getAcceptedParticipants,
  rankCandidatesForActivity,
  resolveMatchesForActivity,
  type MatchResult,
} from "./matching";
import {
  sampleMainTopics,
  sampleMinorInterests,
  sampleActivityTypes,
  sampleVoiceTranscript,
  sampleVoiceSignupHints,
  sampleSuggestedActivities,
  type SeedUser,
} from "./data";
import { extractFromTranscript } from "./voiceTopics";
import { setCached, topicSignature } from "./suggestionsCache";
import {
  fetchLiveMatch,
  fetchMatchCandidates,
  persistActivity,
  persistAndMatch,
  syncFeedback,
  syncGroupCreate,
  syncInterests,
  syncInvitePatch,
  syncInvitesCreate,
  syncSignup,
  syncVerify,
  syncVoice,
} from "./neo4jClient";
import { currentUserContext, DEMO_ID, type UserContext } from "./currentUser";
import { isCollect, isDemo } from "./appMode";
import {
  fillSignupGaps,
  pickArchetype,
  postcodeToNeighbourhood,
  TRANSCRIPT_VARIANTS,
  type Archetype,
} from "./archetypes";

interface Signup {
  first_name: string;
  email: string;
  age: number | null;
  gender: string;
  gender_pref: string;
  postcode: string;
  languages_spoken: string[];
  languages_comfortable: string[];
  language_other: string;
  availability: string[];
  commitment: string;
}

interface State {
  signup: Signup;
  transcript: string;
  topics: Topic[];
  minorInterests: string[];
  activityTypes: string[];
  suggestedActivities: Activity[];
  activity: Activity;
  inviteResponses: Record<string, "pending" | "accepted" | "declined" | "rescheduled">;
  verified: string[];
  feedback: {
    activityRating?: number;
    eventNote?: string;
    people: Record<string, "again" | "neutral" | "avoid">;
    notes?: string;
  };
}

const initialState: State = {
  signup: {
    first_name: "",
    email: "",
    age: null,
    gender: "",
    gender_pref: "",
    postcode: "",
    languages_spoken: [],
    languages_comfortable: [],
    language_other: "",
    availability: [],
    commitment: "",
  },
  transcript: "",
  topics: [],
  minorInterests: [],
  activityTypes: [],
  suggestedActivities: [],
  activity: defaultCatanActivity,
  inviteResponses: {},
  verified: [],
  feedback: { people: {} },
};

interface SuggestedActivity {
  title: string;
  description: string;
  day: string;
  time: string;
  duration: string;
  location_area: string;
  exact_venue: string;
  group_size_target: number;
  language: string;
  energy_level: string;
  specific_interest_tags: string[];
  broader_interest_tags: string[];
  reason: string;
}

interface LiveProfile {
  topics: { title: string; explanation: string; tags: string[] }[];
  minor_interests: string[];
  languages: string[];
  activity_types: string[];
  availability?: string[];
  commitment?: string;
  activities: SuggestedActivity[];
}

const KNOWN_LANGS = ["English", "Dutch", "German", "French", "Spanish", "Arabic"];

// Map free-form language names from the LLM onto the chip vocabulary used by
// the profile form. Anything we don't recognise collapses into "Other" + a
// free-text label so the gap-filler can show it pre-filled.
function mapLanguages(names: string[]): { list: string[]; other?: string } {
  const known: string[] = [];
  const unknown: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const hit = KNOWN_LANGS.find((l) => l.toLowerCase() === name.toLowerCase());
    if (hit) {
      if (!known.includes(hit)) known.push(hit);
    } else if (!unknown.includes(name)) {
      unknown.push(name);
    }
  }
  if (unknown.length > 0) known.push("Other");
  return { list: known, other: unknown[0] };
}

// Translate the voice analysis into signup-form fields, but only for fields
// the user hasn't already provided — so re-running analysis never clobbers a
// real answer. gender / gender_preference / postcode are never inferred from
// voice; the gap-filler always asks those explicitly.
function deriveSignupFromProfile(
  current: Signup,
  profile: LiveProfile,
): Partial<Signup> {
  const patch: Partial<Signup> = {};
  if (!current.languages_comfortable.length && profile.languages.length) {
    const { list, other } = mapLanguages(profile.languages);
    if (list.length) {
      patch.languages_comfortable = list;
      if (!current.languages_spoken.length) patch.languages_spoken = list;
      if (other && !current.language_other) patch.language_other = other;
    }
  }
  if (!current.availability.length && profile.availability?.length) {
    patch.availability = profile.availability;
  }
  if (!current.commitment && profile.commitment) {
    patch.commitment = profile.commitment;
  }
  return patch;
}

function deriveRhythm(day: string): string {
  const d = day.toLowerCase();
  if (d.includes("week")) return "weekly";
  if (/(saturday|sunday)/.test(d)) return "weekly-weekend";
  return `weekly-${d}`;
}

function suggestedToActivity(
  s: SuggestedActivity,
  i: number,
  creatorId: string = DEMO_ID,
): Activity {
  return {
    id: `a_ai_${i}_${Date.now()}`,
    creator_user_id: creatorId,
    title: s.title,
    description: s.description,
    activity_type: "one-off",
    specific_interest_tags: s.specific_interest_tags,
    broader_interest_tags: s.broader_interest_tags,
    day: s.day,
    time: s.time,
    duration: s.duration,
    location_area: s.location_area,
    exact_venue: s.exact_venue,
    group_size_target: s.group_size_target,
    minimum_group_size: Math.max(2, s.group_size_target - 1),
    language: s.language,
    energy_level: s.energy_level,
    note: s.description,
    status: "suggested",
  };
}

interface Ctx {
  state: State;
  setSignup: (patch: Partial<Signup>) => void;
  /** Write the validated signup to Neo4j once, on Continue (not while typing). */
  commitSignup: () => void;
  loadSampleVoice: () => void;
  /** Random archetype + transcript variant for skip paths. Patches only empty signup fields. */
  loadRandomArchetype: () => void;
  /** Patch only the still-empty signup fields with a random archetype. */
  fillSignupRandom: () => void;
  setLiveTranscript: (transcript: string) => void;
  setLiveProfile: (transcript: string, profile: LiveProfile) => void;
  setSuggestedActivities: (suggestions: SuggestedActivity[]) => void;
  updateTopic: (id: string, patch: Partial<Topic>) => void;
  removeTopic: (id: string) => void;
  toggleHideTopic: (id: string) => void;
  setActivity: (patch: Partial<Activity>) => void;
  /** Add an activity id to the Neo4j sync set so it pre-warms before editing. */
  markActivityForSync: (id: string) => void;
  matches: MatchResult[];
  matchSource: "graph" | "mock" | "loading";
  matchLoading: boolean;
  /** Accepted invitees (graph-ranked) that the group screens render. */
  acceptedInvitees: SeedUser[];
  setInviteResponse: (
    userId: string,
    status: "pending" | "accepted" | "declined" | "rescheduled",
  ) => void;
  simulateInvites: () => Promise<void>;
  verifyUser: (userId?: string) => void;
  setFeedback: (patch: Partial<State["feedback"]>) => void;
  /** Final submit — POST feedback into Neo4j (RATED + PREFERS_PERSON + AVOID edges). */
  submitFeedback: () => void;
  /** Outcome-A — create a RecurringGroup born from the current activity. Returns the group id. */
  createRecurringGroup: () => string;
  /** Leave the named group — drops the MEMBER_OF edge for current user. */
  leaveRecurringGroup: (groupId: string) => void;
  resetDemo: () => void;
  /** True once localStorage has been read into state — gates one-shot snapshots. */
  hydrated: boolean;
}

const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "homing-demo-v1";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>(() =>
    rankCandidatesForActivity(initialState.activity),
  );
  const [matchSource, setMatchSource] = useState<"graph" | "mock" | "loading">("mock");
  const [matchLoading, setMatchLoading] = useState(false);

  // Tracks which activity ids have already been mirrored into Neo4j so we
  // don't re-fire calls on a state rehydration or a re-render. Pre-populated
  // during rehydration with any activities loaded from localStorage so a
  // page reload doesn't trigger a wave of API calls on the start page.
  const syncedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        setState({ ...initialState, ...parsed });
        for (const a of parsed.suggestedActivities ?? []) {
          if (a?.id) syncedRef.current.add(a.id);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {}
    }, 250);
    return () => clearTimeout(handle);
  }, [state, hydrated]);

  // Mirror every newly-generated activity into Neo4j. Fail-soft — the live
  // UX never depends on Neo4j being reachable; the dev panel surfaces any
  // failures.
  useEffect(() => {
    if (!hydrated) return;
    // The collect build never uses activities — it only records who the person
    // is and what they like. Persisting analyze's throwaway activity ideas would
    // just pile up orphan Activity nodes that accumulate on every re-record.
    if (isCollect()) return;
    for (const a of state.suggestedActivities) {
      if (!a?.id || syncedRef.current.has(a.id)) continue;
      syncedRef.current.add(a.id);
      // Only create the Activity node + REQUIRES edges here. The full match
      // runs once the user actually picks a card and taps "Ask people", so we
      // don't fire three throwaway match queries on the suggestions screen.
      persistActivity(a);
    }
  }, [hydrated, state.suggestedActivities]);

  // Debounced re-upsert of the *currently-edited* activity (/activity/edit).
  // Skips the initial defaultCatanActivity (we don't want to flood Neo4j
  // with the default until the user actually picks something). Once the
  // activity id appears in suggestedActivities, edits flow through.
  const activitySyncedRef = useRef<string | null>(null);
  // Signature of the activity that simulateInvites() last matched. The
  // debounced edit-sync effect below skips re-matching it so "Ask people"
  // fires exactly one match call instead of racing a second one.
  const invitedActivityRef = useRef<string | null>(null);
  // Caches the most recent resolved match so "Ask people" can reuse a graph
  // ranking the edit-page debounce already produced for the same activity,
  // instead of paying a second persist + match round-trip on tap.
  const lastMatchRef = useRef<{
    sig: string;
    source: "graph" | "mock";
    matches: MatchResult[];
  } | null>(null);

  const applyMatchResults = useCallback(
    (activity: Activity, graphCandidates: Awaited<ReturnType<typeof fetchMatchCandidates>>) => {
      const resolved = resolveMatchesForActivity(activity, graphCandidates);
      const source: "graph" | "mock" = graphCandidates !== null ? "graph" : "mock";
      setMatches(resolved);
      setMatchSource(source);
      setMatchLoading(false);
      lastMatchRef.current = { sig: JSON.stringify(activity), source, matches: resolved };
    },
    [],
  );

  const refreshMatches = useCallback(
    async (activity: Activity, opts: { persist?: boolean } = {}) => {
      setMatchLoading(true);
      setMatchSource("loading");
      const creatorId = activity.creator_user_id || currentUserContext(state.signup).id;
      let graphCandidates: Awaited<ReturnType<typeof fetchMatchCandidates>> = null;
      if (isDemo()) {
        // Demo is read-only — rank the real signed-up network by shared
        // interest instead of writing an Activity node.
        graphCandidates = await fetchLiveMatch(
          [...activity.specific_interest_tags, ...activity.broader_interest_tags],
          creatorId,
        );
      } else if (opts.persist) {
        graphCandidates = await persistAndMatch(activity);
      } else {
        graphCandidates = await fetchMatchCandidates(activity.id, creatorId);
        if (graphCandidates === null) {
          graphCandidates = await persistAndMatch(activity);
        }
      }
      applyMatchResults(activity, graphCandidates);
    },
    [applyMatchResults, state.signup],
  );

  useEffect(() => {
    if (!hydrated) return;
    const a = state.activity;
    if (!a?.id || !syncedRef.current.has(a.id)) return;
    const sig = JSON.stringify(a);
    if (activitySyncedRef.current === sig) return;
    // simulateInvites() already matched this exact activity — don't fire a
    // second, redundant match call right behind it.
    if (invitedActivityRef.current === sig) return;
    const handle = setTimeout(() => {
      activitySyncedRef.current = sig;
      void refreshMatches(a, { persist: true });
    }, 600);
    return () => clearTimeout(handle);
  }, [hydrated, state.activity, refreshMatches]);

  // Mirror voice transcript → VoiceProfile. Fires once per distinct
  // non-empty transcript value. Sample / live source inferred from the
  // demo flag on the current user context.
  const voiceSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const t = state.transcript;
    if (!t || voiceSyncedRef.current === t) return;
    voiceSyncedRef.current = t;
    const ctx = currentUserContext(state.signup);
    syncVoice({
      user_id: ctx.id,
      transcript: t,
      source: ctx.demo ? "sample" : "live",
      demo: ctx.demo,
    });
  }, [hydrated, state.transcript, state.signup]);

  // Mirror topics → LIKES edges. Debounced 400ms so rapid topic edits in
  // /themes don't trigger N round-trips.
  const interestsSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const visible = state.topics.filter((t) => !t.hidden);
    if (visible.length === 0) return;
    const ctx = currentUserContext(state.signup);
    const sig = JSON.stringify(visible.map((t) => ({ id: t.id, title: t.title, hidden: t.hidden })));
    if (interestsSyncedRef.current === sig) return;
    const handle = setTimeout(() => {
      interestsSyncedRef.current = sig;
      syncInterests({
        user_id: ctx.id,
        demo: ctx.demo,
        topics: state.topics.map((t) => ({
          title: t.title,
          weight: t.hidden ? 0 : 1,
          source: "voice-analysis",
          hidden: !!t.hidden,
        })),
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [hydrated, state.topics, state.signup]);

  const setSignup = useCallback((patch: Partial<Signup>) => {
    setState((s) => ({ ...s, signup: { ...s.signup, ...patch } }));
  }, []);

  // Explicit one-shot signup write. Nothing is mirrored into Neo4j while the
  // user types — the User node is created only when they tap "Continue" on a
  // validated form (the page-level canContinue gate runs before this fires).
  // Reads the latest signup via a setState snapshot to avoid stale closures.
  const commitSignup = useCallback(() => {
    let snap: { sig: Signup; ctx: UserContext } | null = null;
    setState((s) => {
      snap = { sig: s.signup, ctx: currentUserContext(s.signup) };
      return s;
    });
    if (!snap) return;
    const { sig, ctx } = snap as { sig: Signup; ctx: UserContext };
    syncSignup({
      id: ctx.id,
      demo: ctx.demo,
      first_name: sig.first_name || undefined,
      email: sig.email || undefined,
      age: sig.age ?? undefined,
      gender: sig.gender || undefined,
      gender_preference: sig.gender_pref || undefined,
      postcode: sig.postcode || undefined,
      neighbourhood: postcodeToNeighbourhood(sig.postcode),
      language_other: sig.language_other || undefined,
      commitment_appetite: sig.commitment || undefined,
      languages_spoken: sig.languages_spoken.length ? sig.languages_spoken : undefined,
      languages_comfortable: sig.languages_comfortable.length ? sig.languages_comfortable : undefined,
      availability: sig.availability.length ? sig.availability : undefined,
    });
  }, []);

  const loadSampleVoice = useCallback(() => {
    const creatorId = currentUserContext(state.signup).id;
    setState((s) => {
      const hints = sampleVoiceSignupHints;
      const signupPatch: Partial<Signup> = {};
      if (!s.signup.languages_spoken.length)
        signupPatch.languages_spoken = [...hints.languages_spoken];
      if (!s.signup.languages_comfortable.length)
        signupPatch.languages_comfortable = [...hints.languages_comfortable];
      if (!s.signup.availability.length)
        signupPatch.availability = [...hints.availability];
      if (!s.signup.commitment) signupPatch.commitment = hints.commitment;

      return {
        ...s,
        signup: { ...s.signup, ...signupPatch },
        transcript: sampleVoiceTranscript,
        topics: sampleMainTopics.map((t) => ({ ...t })),
        minorInterests: [...sampleMinorInterests],
        activityTypes: [...sampleActivityTypes],
        suggestedActivities: sampleSuggestedActivities.map((a, i) =>
          suggestedToActivity(a, i, creatorId),
        ),
      };
    });
  }, [state.signup]);

  // Apply a random archetype + its transcript variant. Fills only empty
  // signup fields so a partial signup doesn't get clobbered. Used by the
  // demo skip buttons so every demo run looks different in the graph.
  const applyArchetype = useCallback((archetype: Archetype, opts: { signupOnly?: boolean } = {}) => {
    setState((s) => {
      const signupPatch = fillSignupGaps(s.signup, archetype);
      const variant = TRANSCRIPT_VARIANTS[archetype.transcript_id];
      const creatorId = currentUserContext({ ...s.signup, ...signupPatch }).id;
      const next: State = {
        ...s,
        signup: { ...s.signup, ...signupPatch },
      };
      if (!opts.signupOnly) {
        next.transcript = variant.transcript;
        next.topics = variant.topics.map((t, i) => ({
          id: `t_demo_${archetype.transcript_id}_${i}`,
          title: t.title,
          explanation: t.explanation,
          tags: t.tags,
        }));
        next.minorInterests = [...variant.minor_interests];
        next.activityTypes = [...variant.activity_types];
        next.suggestedActivities = variant.activities.map((a, i) =>
          suggestedToActivity(a, i, creatorId),
        );
        // Pre-seed the suggestions cache with this variant's hand-curated
        // activities, keyed by the same topic signature /themes computes, so
        // the skip-path never fires an /api/suggest LLM call on /themes.
        setCached(
          topicSignature(
            variant.topics.map((t) => ({ title: t.title, tags: t.tags })),
          ),
          variant.activities,
        );
      }
      return next;
    });
  }, []);

  const loadRandomArchetype = useCallback(() => {
    applyArchetype(pickArchetype());
  }, [applyArchetype]);

  const fillSignupRandom = useCallback(() => {
    applyArchetype(pickArchetype(), { signupOnly: true });
  }, [applyArchetype]);

  const setLiveTranscript = useCallback((transcript: string) => {
    const extracted = extractFromTranscript(transcript);
    setState((s) => ({
      ...s,
      transcript,
      topics: extracted.topics,
      minorInterests:
        extracted.minorInterests.length > 0
          ? extracted.minorInterests
          : [...sampleMinorInterests].slice(0, 3),
      activityTypes: [...sampleActivityTypes],
    }));
  }, []);

  const setLiveProfile = useCallback(
    (transcript: string, profile: LiveProfile) => {
      const creatorId = currentUserContext(state.signup).id;
      const generatedActivities = (profile.activities ?? []).map((a, i) =>
        suggestedToActivity(a, i, creatorId),
      );
      setState((s) => ({
        ...s,
        transcript,
        signup: { ...s.signup, ...deriveSignupFromProfile(s.signup, profile) },
        topics: profile.topics.map((t, i) => ({
          id: `t_ai_${i}`,
          title: t.title,
          explanation: t.explanation,
          tags: t.tags,
        })),
        minorInterests:
          profile.minor_interests.length > 0
            ? profile.minor_interests
            : [...sampleMinorInterests].slice(0, 3),
        activityTypes:
          profile.activity_types.length > 0
            ? profile.activity_types
            : [...sampleActivityTypes],
        suggestedActivities: generatedActivities,
      }));
    },
    [],
  );

  const setSuggestedActivities = useCallback(
    (suggestions: SuggestedActivity[]) => {
      const creatorId = currentUserContext(state.signup).id;
      const mapped = suggestions.map((s, i) =>
        suggestedToActivity(s, i, creatorId),
      );
      setState((s) => ({
        ...s,
        suggestedActivities: mapped,
      }));
    },
    [state.signup],
  );

  const updateTopic = useCallback((id: string, patch: Partial<Topic>) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const removeTopic = useCallback((id: string) => {
    setState((s) => ({ ...s, topics: s.topics.filter((t) => t.id !== id) }));
  }, []);

  const toggleHideTopic = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) =>
        t.id === id ? { ...t, hidden: !t.hidden } : t,
      ),
    }));
  }, []);

  const setActivity = useCallback((patch: Partial<Activity>) => {
    setState((s) => ({ ...s, activity: { ...s.activity, ...patch } }));
  }, []);

  // Pre-warm the graph for an activity the moment the user picks it on
  // /suggestions, so the edit-page debounced sync (and the eventual match)
  // run against an Activity node that already exists.
  const markActivityForSync = useCallback((id: string) => {
    if (id) syncedRef.current.add(id);
  }, []);

  // The group that actually formed — accepted invitees ordered by match
  // score. Drives the details, chat, and feedback screens so they always
  // reflect the same people the graph match surfaced.
  const acceptedInvitees = useMemo(
    () =>
      getAcceptedParticipants(
        matches,
        state.inviteResponses,
        state.activity.minimum_group_size,
      ).map((m) => m.user),
    [matches, state.inviteResponses, state.activity.minimum_group_size],
  );

  const setInviteResponse = useCallback(
    (userId: string, status: "pending" | "accepted" | "declined" | "rescheduled") => {
      let snapshot: { activity: Activity; demo: boolean } | null = null;
      setState((s) => {
        snapshot = {
          activity: s.activity,
          demo: currentUserContext(s.signup).demo,
        };
        return {
          ...s,
          inviteResponses: { ...s.inviteResponses, [userId]: status },
        };
      });
      if (snapshot && (snapshot as { activity: Activity }).activity?.id) {
        const snap = snapshot as { activity: Activity; demo: boolean };
        syncInvitePatch({
          activity_id: snap.activity.id,
          invited_user_id: userId,
          status,
          demo: snap.demo,
        });
      }
    },
    [],
  );

  const simulateInvites = useCallback(async (): Promise<void> => {
    const activity = state.activity;
    const demo = currentUserContext(state.signup).demo;
    const sig = JSON.stringify(activity);
    // Mark this activity so the debounced edit-sync effect doesn't fire a
    // second match call behind us.
    invitedActivityRef.current = sig;
    syncedRef.current.add(activity.id);

    // Reuse the warm graph ranking the edit-page debounce already produced
    // for this exact activity — no persist + match round-trip on tap, and no
    // "loading" flash on /activity/finding. Only reuse a graph result; a mock
    // fallback still retries the graph in case it has come back up.
    const warm = lastMatchRef.current;
    let ranked: MatchResult[];
    if (warm && warm.sig === sig && warm.source === "graph") {
      ranked = warm.matches;
    } else {
      setMatchLoading(true);
      setMatchSource("loading");
      const graphCandidates = isDemo()
        ? await fetchLiveMatch(
            [...activity.specific_interest_tags, ...activity.broader_interest_tags],
            activity.creator_user_id,
          )
        : await persistAndMatch(activity);
      ranked = resolveMatchesForActivity(activity, graphCandidates);
      const source: "graph" | "mock" = graphCandidates !== null ? "graph" : "mock";
      setMatches(ranked);
      setMatchSource(source);
      setMatchLoading(false);
      lastMatchRef.current = { sig, source, matches: ranked };
    }

    const responses: Record<
      string,
      "pending" | "accepted" | "declined" | "rescheduled"
    > = {};
    const accepting = ranked
      .filter((m) => !m.excluded && m.score > 0)
      .slice(0, 4);
    accepting.forEach((m, i) => {
      responses[m.user.id] = i < 3 ? "accepted" : "pending";
    });

    setState((s) => ({ ...s, inviteResponses: responses }));

    const userIds = Object.keys(responses);
    if (userIds.length === 0) return;

    const inviteEntries = accepting.map((m) => ({
      user_id: m.user.id,
      match_score: m.score,
      match_reasons: m.reasons,
    }));

    // The match result is already in state, so the UI can advance to
    // /activity/finding now. The INVITED edge writes are pure graph mirroring
    // and nothing downstream blocks on them — fire them in the background so
    // navigation isn't gated on 4-6 sequential AuraDB round-trips. We still
    // create the invites first, then fan the status patches out in parallel.
    void (async () => {
      await syncInvitesCreate({
        activity_id: activity.id,
        invites: inviteEntries,
        demo,
      });
      await Promise.all(
        Object.entries(responses)
          .filter(([, status]) => status === "accepted" || status === "declined")
          .map(([uid, status]) =>
            syncInvitePatch({
              activity_id: activity.id,
              invited_user_id: uid,
              status,
              demo,
            }),
          ),
      );
    })();
  }, [state.activity, state.signup]);

  const verifyUser = useCallback((userId?: string) => {
    let snap: { id: string; activity_id?: string; demo: boolean } | null = null;
    setState((s) => {
      const ctx = currentUserContext(s.signup);
      const id = userId ?? ctx.id;
      if (s.verified.includes(id)) return s;
      snap = { id, activity_id: s.activity?.id, demo: ctx.demo };
      return { ...s, verified: [...s.verified, id] };
    });
    if (snap) {
      const captured = snap as { id: string; activity_id?: string; demo: boolean };
      syncVerify({
        user_id: captured.id,
        activity_id: captured.activity_id,
        method: "simulated",
        demo: captured.demo,
      });
    }
  }, []);

  const submitFeedback = useCallback(() => {
    let snap: {
      id: string;
      activity_id: string;
      rating?: number;
      note?: string;
      people: Record<string, "again" | "neutral" | "avoid">;
      demo: boolean;
    } | null = null;
    setState((s) => {
      const ctx = currentUserContext(s.signup);
      snap = {
        id: ctx.id,
        activity_id: s.activity.id,
        rating: s.feedback.activityRating,
        note: s.feedback.eventNote,
        people: s.feedback.people,
        demo: ctx.demo,
      };
      return s;
    });
    if (!snap) return;
    const captured = snap as {
      id: string;
      activity_id: string;
      rating?: number;
      note?: string;
      people: Record<string, "again" | "neutral" | "avoid">;
      demo: boolean;
    };
    syncFeedback({
      user_id: captured.id,
      activity_id: captured.activity_id,
      activity_rating: captured.rating,
      event_note: captured.note,
      people_feedback: captured.people,
      demo: captured.demo,
    });
  }, []);

  const createRecurringGroup = useCallback((): string => {
    let snap: {
      group_id: string;
      activity: Activity;
      members: string[];
      demo: boolean;
    } | null = null;
    let outId = "";
    setState((s) => {
      const ctx = currentUserContext(s.signup);
      const id = `g_${s.activity.id}_${Date.now().toString(36)}`;
      outId = id;
      // Members: current user + everyone who accepted the invite.
      const acceptedIds = Object.entries(s.inviteResponses)
        .filter(([, status]) => status === "accepted")
        .map(([uid]) => uid);
      const members = [ctx.id, ...acceptedIds];
      snap = {
        group_id: id,
        activity: s.activity,
        members,
        demo: ctx.demo,
      };
      return s;
    });
    if (!snap) return outId;
    const captured = snap as {
      group_id: string;
      activity: Activity;
      members: string[];
      demo: boolean;
    };
    syncGroupCreate({
      group_id: captured.group_id,
      name: `${captured.activity.title} group`,
      theme: captured.activity.specific_interest_tags[0] ?? "general",
      rhythm: deriveRhythm(captured.activity.day),
      born_from_activity_id: captured.activity.id,
      member_user_ids: captured.members,
      demo: captured.demo,
    });
    return outId;
  }, []);

  const leaveRecurringGroup = useCallback((groupId: string) => {
    let userId = DEMO_ID;
    let isDemo = true;
    setState((s) => {
      const ctx = currentUserContext(s.signup);
      userId = ctx.id;
      isDemo = ctx.demo;
      return s;
    });
    void isDemo;
    fetch("/api/neo4j/group", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, group_id: groupId }),
    }).catch(() => {});
  }, []);

  const setFeedback = useCallback((patch: Partial<State["feedback"]>) => {
    setState((s) => ({ ...s, feedback: { ...s.feedback, ...patch } }));
  }, []);

  const resetDemo = useCallback(() => {
    setState(initialState);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const value: Ctx = {
    state,
    setSignup,
    commitSignup,
    loadSampleVoice,
    loadRandomArchetype,
    fillSignupRandom,
    setLiveTranscript,
    setLiveProfile,
    setSuggestedActivities,
    updateTopic,
    removeTopic,
    toggleHideTopic,
    setActivity,
    markActivityForSync,
    matches,
    matchSource,
    matchLoading,
    acceptedInvitees,
    setInviteResponse,
    simulateInvites,
    verifyUser,
    setFeedback,
    submitFeedback,
    createRecurringGroup,
    leaveRecurringGroup,
    resetDemo,
    hydrated,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
