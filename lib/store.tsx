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
import type {
  Activity,
  ImplicitPreference,
  LanguageConfidence,
  ProfileMissingField,
  Topic,
} from "./types";
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
import { isDemo } from "./appMode";
import {
  runVoicePipeline,
  type PipelineStage,
  type SimilarPerson,
} from "./voicePipeline";
import { takeAudio } from "./audioStash";
import {
  mirrorUserGraph,
  snapshotFromState,
  type GraphMirrorSnapshot,
} from "./graphMirror";
import {
  fillSignupGaps,
  pickArchetype,
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
  detectedLanguage: string | null;
  companionReflection: string;
  matchingNotes: string;
  implicitPreferences: ImplicitPreference[];
  missingFields: ProfileMissingField[];
  languageConfidence: LanguageConfidence;
  topics: Topic[];
  minorInterests: string[];
  activityTypes: string[];
  suggestedActivities: Activity[];
  pipelineStage: PipelineStage;
  pipelineError: string | null;
  similarPeople: SimilarPerson[];
  /** Bumped when a new voice session starts — resets profile questionnaire snapshot. */
  profileSessionId: number;
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
  detectedLanguage: null,
  companionReflection: "",
  matchingNotes: "",
  implicitPreferences: [],
  missingFields: [],
  languageConfidence: "none",
  topics: [],
  minorInterests: [],
  activityTypes: [],
  suggestedActivities: [],
  pipelineStage: "idle",
  pipelineError: null,
  similarPeople: [],
  profileSessionId: 0,
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
  linked_topic_title?: string;
  reason: string;
}

interface LiveProfile {
  topics: { title: string; explanation: string; tags: string[]; quote?: string }[];
  minor_interests: string[];
  languages: string[];
  language_confidence?: LanguageConfidence;
  activity_types: string[];
  availability?: string[];
  commitment?: string;
  implicit_preferences?: ImplicitPreference[];
  companion_reflection?: string;
  matching_notes?: string;
  missing_fields?: ProfileMissingField[];
  detected_language?: string | null;
  activities: SuggestedActivity[];
}

// Translate the voice analysis into signup-form fields, but only for fields
// the user hasn't already provided — so re-running analysis never clobbers a
// real answer. gender / postcode are never inferred from voice; the gap-filler
// always asks those explicitly.
function deriveSignupFromProfile(
  current: Signup,
  profile: LiveProfile,
): Partial<Signup> {
  const patch: Partial<Signup> = {};
  const missing = new Set(profile.missing_fields ?? []);
  if (
    !current.availability.length &&
    profile.availability?.length &&
    !missing.has("availability")
  ) {
    patch.availability = profile.availability;
  }
  if (
    !current.commitment &&
    profile.commitment &&
    !missing.has("commitment")
  ) {
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
    language: s.language || "Flexible",
    energy_level: s.energy_level,
    note: s.reason || s.description,
    status: "suggested",
  };
}

interface Ctx {
  state: State;
  setSignup: (patch: Partial<Signup>) => void;
  /** Write the validated signup to Neo4j once, on Continue (not while typing). */
  commitSignup: (opts?: { profileCompleted?: boolean }) => void;
  /** Full User + VoiceProfile + LIKES sync — awaited before match-live. */
  flushGraphMirror: (opts?: { profileCompleted?: boolean }) => Promise<void>;
  /** Re-query match-live after profile fields land in the graph. */
  refreshSimilarPeople: () => Promise<void>;
  loadSampleVoice: () => void;
  /** Random archetype + transcript variant for skip paths. Patches only empty signup fields. */
  loadRandomArchetype: () => void;
  /** Patch only the still-empty signup fields with a random archetype. */
  fillSignupRandom: () => void;
  setLiveTranscript: (transcript: string) => void;
  setDetectedLanguage: (language: string | null) => void;
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
  pipelineStage: PipelineStage;
  pipelineError: string | null;
  similarPeople: SimilarPerson[];
  startVoicePipeline: (blob: Blob) => void;
  retryPipeline: () => void;
  clearVoiceDerivedState: () => void;
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
  const pipelineAbortRef = useRef<AbortController | null>(null);
  const lastPipelineBlobRef = useRef<Blob | null>(null);
  const signupRef = useRef(state.signup);
  signupRef.current = state.signup;
  const stateRef = useRef(state);
  stateRef.current = state;

  const readGraphSnapshot = useCallback((): GraphMirrorSnapshot => {
    return snapshotFromState(stateRef.current);
  }, []);

  const flushGraphMirror = useCallback(
    async (opts?: { profileCompleted?: boolean }) => {
      await mirrorUserGraph(readGraphSnapshot(), opts);
    },
    [readGraphSnapshot],
  );

  const refreshSimilarPeople = useCallback(async () => {
    const snap = readGraphSnapshot();
    const topicTags = snap.topics
      .filter((t) => !t.hidden)
      .flatMap((t) => [t.title, ...t.tags]);
    if (topicTags.length === 0) return;
    const selfId = currentUserContext(snap.signup).id;
    const people = await fetchLiveMatch(topicTags, selfId);
    if (people) {
      setState((s) => ({
        ...s,
        similarPeople: people.slice(0, 5).map((p) => ({
          user_id: p.user_id,
          first_name: p.first_name,
          neighbourhood: p.neighbourhood,
          score: p.score,
          reasons: p.reasons,
          sync: p.sync,
          shared: p.shared,
        })),
      }));
    }
  }, [readGraphSnapshot]);

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

  // Mirror voice analysis → VoiceProfile. Fires when transcript or any
  // analysis field changes. Sample / live source inferred from demo flag.
  const voiceSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const t = state.transcript;
    if (!t) return;
    const sig = JSON.stringify({
      t,
      lang: state.detectedLanguage,
      langConf: state.languageConfidence,
      notes: state.matchingNotes,
      reflection: state.companionReflection,
      implicit: state.implicitPreferences,
      minor: state.minorInterests,
      activityTypes: state.activityTypes,
      availability: state.signup.availability,
      languages: state.signup.languages_comfortable,
    });
    if (voiceSyncedRef.current === sig) return;
    voiceSyncedRef.current = sig;
    const ctx = currentUserContext(state.signup);
    syncVoice({
      user_id: ctx.id,
      transcript: t,
      source: ctx.demo ? "sample" : "live",
      language: state.detectedLanguage ?? undefined,
      language_confidence: state.languageConfidence,
      matching_notes: state.matchingNotes || undefined,
      companion_reflection: state.companionReflection || undefined,
      implicit_preferences: state.implicitPreferences.length
        ? state.implicitPreferences
        : undefined,
      languages_mentioned: state.signup.languages_comfortable.length
        ? state.signup.languages_comfortable
        : undefined,
      minor_interests: state.minorInterests.length ? state.minorInterests : undefined,
      activity_types: state.activityTypes.length ? state.activityTypes : undefined,
      availability_hints: state.signup.availability.length
        ? state.signup.availability
        : undefined,
      commitment_appetite: state.signup.commitment || undefined,
      demo: ctx.demo,
    });
  }, [
    hydrated,
    state.transcript,
    state.detectedLanguage,
    state.languageConfidence,
    state.matchingNotes,
    state.companionReflection,
    state.implicitPreferences,
    state.minorInterests,
    state.activityTypes,
    state.signup,
  ]);

  // Mirror voice-inferred signup fields → User (languages, availability,
  // commitment). Runs after analysis fills gaps; commitSignup still handles
  // the explicit form Continue tap.
  const voiceSignupSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !state.transcript) return;
    const ctx = currentUserContext(state.signup);
    const patch = {
      languages_spoken: state.signup.languages_spoken,
      languages_comfortable: state.signup.languages_comfortable,
      availability: state.signup.availability,
      commitment: state.signup.commitment,
    };
    const sig = JSON.stringify(patch);
    if (voiceSignupSyncedRef.current === sig) return;
    const hasData =
      patch.languages_comfortable.length > 0 ||
      patch.availability.length > 0 ||
      !!patch.commitment;
    if (!hasData) return;
    voiceSignupSyncedRef.current = sig;
    syncSignup({
      id: ctx.id,
      demo: ctx.demo,
      languages_spoken: patch.languages_spoken.length
        ? patch.languages_spoken
        : undefined,
      languages_comfortable: patch.languages_comfortable.length
        ? patch.languages_comfortable
        : undefined,
      availability: patch.availability.length ? patch.availability : undefined,
      commitment_appetite: patch.commitment || undefined,
    });
  }, [
    hydrated,
    state.transcript,
    state.signup.languages_spoken,
    state.signup.languages_comfortable,
    state.signup.availability,
    state.signup.commitment,
    state.signup,
  ]);

  // Mirror profile answers into Neo4j as the user fills them after voice.
  useEffect(() => {
    if (!hydrated || !state.transcript) return;
    const { gender, postcode, commitment } = state.signup;
    const hasMirrorable =
      !!gender ||
      postcode.trim().length >= 3 ||
      !!commitment ||
      state.signup.languages_comfortable.length > 0 ||
      state.signup.availability.length > 0;
    if (!hasMirrorable) return;
    const handle = setTimeout(() => {
      void flushGraphMirror();
    }, 450);
    return () => clearTimeout(handle);
  }, [
    hydrated,
    state.transcript,
    state.signup.gender,
    state.signup.postcode,
    state.signup.languages_comfortable,
    state.signup.languages_spoken,
    state.signup.availability,
    state.signup.commitment,
    flushGraphMirror,
  ]);

  // Mirror topics → LIKES edges. Debounced 400ms so rapid topic edits in
  // /themes don't trigger N round-trips.
  const interestsSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const visible = state.topics.filter((t) => !t.hidden);
    if (visible.length === 0 && state.minorInterests.length === 0) return;
    const ctx = currentUserContext(state.signup);
    const sig = JSON.stringify({
      topics: visible.map((t) => ({ id: t.id, title: t.title, hidden: t.hidden })),
      minor: state.minorInterests,
    });
    if (interestsSyncedRef.current === sig) return;
    const handle = setTimeout(() => {
      interestsSyncedRef.current = sig;
      syncInterests({
        user_id: ctx.id,
        demo: ctx.demo,
        topics: [
          ...state.topics.map((t) => ({
            title: t.title,
            weight: t.hidden ? 0 : 1,
            source: "voice-analysis" as const,
            hidden: !!t.hidden,
            tags: t.tags,
          })),
          ...state.minorInterests.map((title) => ({
            title,
            weight: 0.5,
            source: "voice-analysis" as const,
          })),
        ],
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [hydrated, state.topics, state.minorInterests, state.signup]);

  const setSignup = useCallback((patch: Partial<Signup>) => {
    setState((s) => ({ ...s, signup: { ...s.signup, ...patch } }));
  }, []);

  // Explicit one-shot signup write. Nothing is mirrored into Neo4j while the
  // user types — the User node is created only when they tap "Continue" on a
  // validated form (the page-level canContinue gate runs before this fires).
  // Reads the latest signup via a setState snapshot to avoid stale closures.
  const commitSignup = useCallback(
    (opts?: { profileCompleted?: boolean }) => {
      void flushGraphMirror(opts);
    },
    [flushGraphMirror],
  );

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
      minorInterests: extracted.minorInterests,
      activityTypes: [],
    }));
  }, []);

  const setDetectedLanguage = useCallback((language: string | null) => {
    setState((s) => ({ ...s, detectedLanguage: language }));
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
        detectedLanguage: profile.detected_language ?? s.detectedLanguage,
        companionReflection: profile.companion_reflection ?? "",
        matchingNotes: profile.matching_notes ?? "",
        implicitPreferences: profile.implicit_preferences ?? [],
        missingFields: profile.missing_fields ?? [],
        languageConfidence: profile.language_confidence ?? "none",
        signup: { ...s.signup, ...deriveSignupFromProfile(s.signup, profile) },
        topics: profile.topics.map((t, i) => ({
          id: `t_ai_${i}`,
          title: t.title,
          explanation: t.explanation,
          tags: t.tags,
          quote: t.quote,
        })),
        minorInterests: profile.minor_interests,
        activityTypes: profile.activity_types,
        suggestedActivities: generatedActivities,
      }));
    },
    [],
  );

  const setSuggestedActivities = useCallback(
    (suggestions: SuggestedActivity[]) => {
      setState((s) => {
        const creatorId = currentUserContext(s.signup).id;
        const mapped = suggestions.map((item, i) =>
          suggestedToActivity(item, i, creatorId),
        );
        return { ...s, suggestedActivities: mapped };
      });
    },
    [],
  );

  const clearVoiceDerivedState = useCallback(() => {
    pipelineAbortRef.current?.abort();
    pipelineAbortRef.current = null;
    lastPipelineBlobRef.current = null;
    setState((s) => ({
      ...s,
      transcript: "",
      detectedLanguage: null,
      companionReflection: "",
      matchingNotes: "",
      implicitPreferences: [],
      missingFields: [],
      languageConfidence: "none",
      topics: [],
      minorInterests: [],
      activityTypes: [],
      suggestedActivities: [],
      pipelineStage: "idle",
      pipelineError: null,
      similarPeople: [],
    }));
  }, []);

  const startVoicePipeline = useCallback((blob: Blob) => {
    pipelineAbortRef.current?.abort();
    const ac = new AbortController();
    pipelineAbortRef.current = ac;
    lastPipelineBlobRef.current = blob;

    setState((s) => ({
      ...s,
      profileSessionId: s.profileSessionId + 1,
      signup: {
        ...s.signup,
        gender: "",
        postcode: "",
        availability: [],
        commitment: "",
      },
      pipelineStage: "transcribing",
      pipelineError: null,
      similarPeople: [],
    }));

    void runVoicePipeline(
      blob,
      {
        onStage: (stage) => {
          setState((s) => ({ ...s, pipelineStage: stage }));
        },
        onTranscriptSeed: (transcript) => {
          setState((s) => ({ ...s, transcript }));
        },
        onDetectedLanguage: (language) => {
          setState((s) => ({ ...s, detectedLanguage: language }));
        },
        onUnderstand: (transcript, data) => {
          const profile: LiveProfile = {
            topics: data.topics,
            minor_interests: data.minor_interests ?? [],
            languages: data.languages ?? [],
            language_confidence:
              (data.language_confidence as LanguageConfidence) ?? "none",
            activity_types: data.activity_types ?? [],
            availability: data.availability,
            commitment: data.commitment,
            implicit_preferences: (data.implicit_preferences ??
              []) as ImplicitPreference[],
            companion_reflection: data.companion_reflection,
            matching_notes: data.matching_notes,
            missing_fields: (data.missing_fields ??
              []) as ProfileMissingField[],
            detected_language: data.detected_language,
            activities: [],
          };
          setState((s) => ({
              ...s,
              transcript,
              detectedLanguage:
                profile.detected_language ?? s.detectedLanguage,
              companionReflection: profile.companion_reflection ?? "",
              matchingNotes: profile.matching_notes ?? "",
              implicitPreferences: profile.implicit_preferences ?? [],
              missingFields: profile.missing_fields ?? [],
              languageConfidence: profile.language_confidence ?? "none",
              signup: {
                ...s.signup,
                ...deriveSignupFromProfile(s.signup, profile),
              },
              topics: profile.topics.map((t, i) => ({
                id: `t_ai_${i}`,
                title: t.title,
                explanation: t.explanation,
                tags: t.tags,
                quote: t.quote,
              })),
              minorInterests: profile.minor_interests,
              activityTypes: profile.activity_types,
          }));
        },
        onActivities: (activities) => {
          setSuggestedActivities(activities);
        },
        onSimilarPeople: (people) => {
          setState((s) => ({ ...s, similarPeople: people }));
        },
        onError: (message) => {
          setState((s) => ({
            ...s,
            pipelineError: message,
            pipelineStage: "error",
          }));
        },
      },
      {
        skipActivities: false,
        selfId: currentUserContext(signupRef.current).id,
        signal: ac.signal,
        beforePeopleMatch: async () => {
          await new Promise((r) => setTimeout(r, 50));
          await flushGraphMirror();
        },
      },
    );
  }, [setSuggestedActivities, flushGraphMirror]);

  const retryPipeline = useCallback(() => {
    const blob =
      lastPipelineBlobRef.current ?? takeAudio()?.blob ?? null;
    if (blob) startVoicePipeline(blob);
  }, [startVoicePipeline]);

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
      .slice(0, Math.max(activity.group_size_target - 1, activity.minimum_group_size - 1, 3));
    accepting.forEach((m) => {
      responses[m.user.id] = "accepted";
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
    flushGraphMirror,
    refreshSimilarPeople,
    loadSampleVoice,
    loadRandomArchetype,
    fillSignupRandom,
    setLiveTranscript,
    setDetectedLanguage,
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
    pipelineStage: state.pipelineStage,
    pipelineError: state.pipelineError,
    similarPeople: state.similarPeople,
    startVoicePipeline,
    retryPipeline,
    clearVoiceDerivedState,
    hydrated,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
