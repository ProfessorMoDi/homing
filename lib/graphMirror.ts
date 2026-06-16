// Builds Neo4j sync payloads from app state so every write is complete and
// consistent — User properties, LIKES edges, and VoiceProfile land together.

import type { ImplicitPreference, LanguageConfidence, ProfileMissingField, Topic } from "./types";
import { currentUserContext } from "./currentUser";
import { postcodeToNeighbourhood } from "./archetypes";
import {
  syncInterests,
  syncSignup,
  syncVoice,
  type SignupSync,
  type VoiceSync,
} from "./neo4jClient";

export interface SignupSnapshot {
  first_name: string;
  last_name: string;
  email: string;
  age: number | null;
  gender: string;
  postcode: string;
  languages_spoken: string[];
  languages_comfortable: string[];
  language_other: string;
  availability: string[];
  commitment: string;
}

export interface GraphMirrorSnapshot {
  signup: SignupSnapshot;
  transcript: string;
  detectedLanguage: string | null;
  languageConfidence: LanguageConfidence;
  matchingNotes: string;
  companionReflection: string;
  implicitPreferences: ImplicitPreference[];
  minorInterests: string[];
  activityTypes: string[];
  topics: Topic[];
}

export function buildSignupSync(
  snap: GraphMirrorSnapshot,
  opts: { profileCompleted?: boolean } = {},
): SignupSync {
  const ctx = currentUserContext(snap.signup);
  const sig = snap.signup;

  return {
    id: ctx.id,
    demo: ctx.demo,
    first_name: sig.first_name || undefined,
    last_name: sig.last_name || undefined,
    email: sig.email || undefined,
    age: sig.age ?? undefined,
    gender: sig.gender || undefined,
    postcode: sig.postcode || undefined,
    neighbourhood: sig.postcode ? postcodeToNeighbourhood(sig.postcode) : undefined,
    language_other: sig.language_other || undefined,
    commitment_appetite: sig.commitment || undefined,
    languages_spoken: sig.languages_spoken.length ? sig.languages_spoken : undefined,
    languages_comfortable: sig.languages_comfortable.length
      ? sig.languages_comfortable
      : undefined,
    availability: sig.availability.length ? sig.availability : undefined,
    ...(opts.profileCompleted ? { profile_completed: true } : {}),
  };
}

export function buildVoiceSync(snap: GraphMirrorSnapshot): VoiceSync | null {
  const t = snap.transcript.trim();
  if (!t) return null;
  const ctx = currentUserContext(snap.signup);
  return {
    user_id: ctx.id,
    transcript: t,
    source: ctx.demo ? "sample" : "live",
    language: snap.detectedLanguage ?? undefined,
    language_confidence: snap.languageConfidence,
    matching_notes: snap.matchingNotes || undefined,
    companion_reflection: snap.companionReflection || undefined,
    implicit_preferences: snap.implicitPreferences.length
      ? snap.implicitPreferences
      : undefined,
    languages_mentioned: snap.signup.languages_comfortable.length
      ? snap.signup.languages_comfortable
      : undefined,
    minor_interests: snap.minorInterests.length ? snap.minorInterests : undefined,
    activity_types: snap.activityTypes.length ? snap.activityTypes : undefined,
    availability_hints: snap.signup.availability.length
      ? snap.signup.availability
      : undefined,
    commitment_appetite: snap.signup.commitment || undefined,
    demo: ctx.demo,
  };
}

export function buildInterestsSync(snap: GraphMirrorSnapshot) {
  const ctx = currentUserContext(snap.signup);
  const visible = snap.topics.some((t) => !t.hidden) || snap.minorInterests.length > 0;
  if (!visible) return null;
  return {
    user_id: ctx.id,
    demo: ctx.demo,
    topics: [
      ...snap.topics.map((t) => ({
        title: t.title,
        weight: t.hidden ? 0 : t.core ? 1.5 : 1,
        source: "voice-analysis" as const,
        hidden: !!t.hidden,
        tags: t.tags,
        broader: t.broader,
        related: t.related,
      })),
      ...snap.minorInterests.map((title) => ({
        title,
        weight: 0.5,
        source: "voice-analysis" as const,
      })),
    ],
  };
}

/** Push User + VoiceProfile + LIKES to Neo4j in one shot. Awaited before match-live. */
export async function mirrorUserGraph(
  snap: GraphMirrorSnapshot,
  opts: { profileCompleted?: boolean } = {},
): Promise<void> {
  await syncSignup(buildSignupSync(snap, opts));

  const voice = buildVoiceSync(snap);
  if (voice) await syncVoice(voice);

  const interests = buildInterestsSync(snap);
  if (interests) await syncInterests(interests);
}

export function snapshotFromState(state: {
  signup: SignupSnapshot;
  transcript: string;
  detectedLanguage: string | null;
  languageConfidence: LanguageConfidence;
  matchingNotes: string;
  companionReflection: string;
  implicitPreferences: ImplicitPreference[];
  minorInterests: string[];
  activityTypes: string[];
  topics: Topic[];
  missingFields?: ProfileMissingField[];
}): GraphMirrorSnapshot {
  return {
    signup: state.signup,
    transcript: state.transcript,
    detectedLanguage: state.detectedLanguage,
    languageConfidence: state.languageConfidence,
    matchingNotes: state.matchingNotes,
    companionReflection: state.companionReflection,
    implicitPreferences: state.implicitPreferences,
    minorInterests: state.minorInterests,
    activityTypes: state.activityTypes,
    topics: state.topics,
  };
}
