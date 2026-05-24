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
  rankCandidatesForActivity,
  type MatchResult,
} from "./matching";
import {
  sampleMainTopics,
  sampleMinorInterests,
  sampleActivityTypes,
  sampleVoiceTranscript,
} from "./data";
import { extractFromTranscript } from "./voiceTopics";
import {
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
import { currentUserContext, DEMO_ID } from "./currentUser";
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
  activities: SuggestedActivity[];
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
  matches: MatchResult[];
  setInviteResponse: (
    userId: string,
    status: "pending" | "accepted" | "declined" | "rescheduled",
  ) => void;
  simulateInvites: () => void;
  verifyUser: (userId?: string) => void;
  setFeedback: (patch: Partial<State["feedback"]>) => void;
  /** Final submit — POST feedback into Neo4j (RATED + PREFERS_PERSON + AVOID edges). */
  submitFeedback: () => void;
  /** Outcome-A — create a RecurringGroup born from the current activity. Returns the group id. */
  createRecurringGroup: () => string;
  /** Leave the named group — drops the MEMBER_OF edge for current user. */
  leaveRecurringGroup: (groupId: string) => void;
  resetDemo: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "homing-demo-v1";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [hydrated, setHydrated] = useState(false);

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
    for (const a of state.suggestedActivities) {
      if (!a?.id || syncedRef.current.has(a.id)) continue;
      syncedRef.current.add(a.id);
      persistAndMatch(a);
    }
  }, [hydrated, state.suggestedActivities]);

  // Debounced re-upsert of the *currently-edited* activity (/activity/edit).
  // Skips the initial defaultCatanActivity (we don't want to flood Neo4j
  // with the default until the user actually picks something). Once the
  // activity id appears in suggestedActivities, edits flow through.
  const activitySyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const a = state.activity;
    if (!a?.id || !syncedRef.current.has(a.id)) return;
    const sig = JSON.stringify(a);
    if (activitySyncedRef.current === sig) return;
    const handle = setTimeout(() => {
      activitySyncedRef.current = sig;
      persistAndMatch(a);
    }, 600);
    return () => clearTimeout(handle);
  }, [hydrated, state.activity]);

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

  // Debounced signup → graph sync. Fires 600ms after the user stops typing
  // so the graph User node trails their input without hammering Neo4j on
  // every keystroke. Demo-tagged on first write under u_demo.
  useEffect(() => {
    if (!hydrated) return;
    const sig = state.signup;
    // Don't sync until the user has at least started — first_name or any
    // detail field. An empty signup means we're on landing/voice and the
    // demo path hasn't been entered yet.
    const hasAnyInput =
      !!sig.first_name || !!sig.email || sig.age != null || !!sig.gender ||
      !!sig.postcode || sig.languages_spoken.length > 0 ||
      sig.availability.length > 0 || !!sig.commitment;
    if (!hasAnyInput) return;

    const ctx = currentUserContext(sig);
    const handle = setTimeout(() => {
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
    }, 600);
    return () => clearTimeout(handle);
  }, [hydrated, state.signup]);

  const setSignup = useCallback((patch: Partial<Signup>) => {
    setState((s) => ({ ...s, signup: { ...s.signup, ...patch } }));
  }, []);

  const loadSampleVoice = useCallback(() => {
    setState((s) => ({
      ...s,
      transcript: sampleVoiceTranscript,
      topics: sampleMainTopics.map((t) => ({ ...t })),
      minorInterests: [...sampleMinorInterests],
      activityTypes: [...sampleActivityTypes],
    }));
  }, []);

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

  const matches = useMemo(
    () => rankCandidatesForActivity(state.activity),
    [state.activity],
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

  const simulateInvites = useCallback(() => {
    let snap: {
      responses: Record<string, "pending" | "accepted" | "declined" | "rescheduled">;
      activity: Activity;
      demo: boolean;
    } | null = null;

    setState((s) => {
      const ranked = rankCandidatesForActivity(s.activity);
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
      snap = {
        responses,
        activity: s.activity,
        demo: currentUserContext(s.signup).demo,
      };
      return { ...s, inviteResponses: responses };
    });

    if (!snap) return;
    const captured = snap as {
      responses: Record<string, "pending" | "accepted" | "declined" | "rescheduled">;
      activity: Activity;
      demo: boolean;
    };
    const userIds = Object.keys(captured.responses);
    if (userIds.length === 0) return;

    // Make sure the Activity node exists in the graph before writing
    // INVITED edges. persistAndMatch awaits the activity POST internally.
    persistAndMatch(captured.activity).then(() => {
      syncInvitesCreate({
        activity_id: captured.activity.id,
        invited_user_ids: userIds,
        demo: captured.demo,
      }).then(() => {
        for (const [uid, status] of Object.entries(captured.responses)) {
          if (status === "accepted" || status === "declined") {
            syncInvitePatch({
              activity_id: captured.activity.id,
              invited_user_id: uid,
              status,
              demo: captured.demo,
            });
          }
        }
      });
    });
  }, []);

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
    matches,
    setInviteResponse,
    simulateInvites,
    verifyUser,
    setFeedback,
    submitFeedback,
    createRecurringGroup,
    leaveRecurringGroup,
    resetDemo,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
