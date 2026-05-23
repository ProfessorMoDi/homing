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
import { persistAndMatch } from "./neo4jClient";

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

function suggestedToActivity(s: SuggestedActivity, i: number): Activity {
  return {
    id: `a_ai_${i}_${Date.now()}`,
    creator_user_id: "u_me",
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
  verifyUser: (userId: string) => void;
  setFeedback: (patch: Partial<State["feedback"]>) => void;
  resetDemo: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "homing-demo-v1";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setState({ ...initialState, ...JSON.parse(raw) });
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

  // Mirror every newly-generated activity into Neo4j. We track which ids have
  // already been synced so a state rehydration or a re-render doesn't re-fire
  // the calls. Fail-soft — the live UX never depends on Neo4j being reachable;
  // the dev panel surfaces any failures.
  const syncedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!hydrated) return;
    for (const a of state.suggestedActivities) {
      if (!a?.id || syncedRef.current.has(a.id)) continue;
      syncedRef.current.add(a.id);
      persistAndMatch(a);
    }
  }, [hydrated, state.suggestedActivities]);

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
      const generatedActivities = (profile.activities ?? []).map(
        suggestedToActivity,
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
      const mapped = suggestions.map(suggestedToActivity);
      setState((s) => ({
        ...s,
        suggestedActivities: mapped,
      }));
    },
    [],
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
      setState((s) => ({
        ...s,
        inviteResponses: { ...s.inviteResponses, [userId]: status },
      }));
    },
    [],
  );

  const simulateInvites = useCallback(() => {
    setState((s) => {
      // Top 4 candidates accept, except David (who is excluded for Catan).
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
      return { ...s, inviteResponses: responses };
    });
  }, []);

  const verifyUser = useCallback((userId: string) => {
    setState((s) =>
      s.verified.includes(userId)
        ? s
        : { ...s, verified: [...s.verified, userId] },
    );
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
    resetDemo,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
