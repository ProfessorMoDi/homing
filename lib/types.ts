export type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say";

export type GroupGenderPref =
  | "same-gender"
  | "mixed"
  | "either";

export type Availability =
  | "every-weekend"
  | "weekday-evenings"
  | "thursday-evening"
  | "weekday-daytime"
  | "flexible";

export type Commitment =
  | "try-once"
  | "maybe-weekly"
  | "regular-thing"
  | "open-ended";

export interface User {
  id: string;
  first_name: string;
  email: string;
  age: number;
  gender: Gender;
  gender_preference: GroupGenderPref;
  neighbourhood: string;
  languages_spoken: string[];
  languages_comfortable: string[];
  availability: Availability[];
  commitment_appetite: Commitment;
  verification_status: "unverified" | "verified";
  profile_completed: boolean;
}

export interface VoiceProfile {
  user_id: string;
  transcript: string;
  main_topics: Topic[];
  minor_interests: string[];
  activity_types: string[];
  languages_mentioned: string[];
  commitment_appetite: Commitment;
  social_energy: string[];
  availability_hints: string[];
  life_stage_cues: string[];
  matching_notes: string;
  audio_transcribed_on_device: boolean;
  audio_deleted_status: boolean;
}

export interface Topic {
  id: string;
  title: string;
  explanation: string;
  tags: string[];
  quote?: string;
  hidden?: boolean;
  /** User-starred "this is really me" — syncs as LIKES.weight 1.5. */
  core?: boolean;
  /** LLM-emitted broader categories ("cooking" for "korean cooking"). */
  broader?: string[];
  /** LLM-emitted sibling interests ("bachata" for "salsa"). */
  related?: string[];
}

export interface ImplicitPreference {
  phrase: string;
  evidence_quote?: string;
}

export type LanguageConfidence = "high" | "partial" | "none";

export type ProfileMissingField =
  | "languages_comfortable"
  | "languages_spoken"
  | "availability"
  | "commitment"
  | "gender"
  | "postcode";

export type ActivityStatus =
  | "suggested"
  | "edited"
  | "inviting"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "expired";

export interface Activity {
  id: string;
  creator_user_id: string;
  title: string;
  description: string;
  activity_type: string;
  specific_interest_tags: string[];
  broader_interest_tags: string[];
  day: string;
  time: string;
  duration: string;
  location_area: string;
  exact_venue: string;
  group_size_target: number;
  minimum_group_size: number;
  language: string;
  energy_level: string;
  note?: string;
  status: ActivityStatus;
}

export interface ActivityInvite {
  id: string;
  activity_id: string;
  invited_user_id: string;
  match_score: number;
  match_reasons: string[];
  status:
    | "pending"
    | "accepted"
    | "declined"
    | "suggested_new_time"
    | "timed_out";
}

export interface ConfirmedActivity {
  id: string;
  activity_id: string;
  participants: string[];
  verified_participants: string[];
  group_chat_id: string;
  revealed_details: boolean;
}

export interface Message {
  id: string;
  group_chat_id: string;
  sender: string;
  content: string;
  timestamp: string;
  is_ai_draft: boolean;
  draft_status?: "pending" | "sent" | "skipped" | "edited";
}

export interface PostActivityFeedback {
  user_id: string;
  activity_id: string;
  activity_feedback?: string;
  event_feedback?: string[];
  people_feedback: Record<string, "again" | "neutral" | "avoid">;
  private_notes?: string;
}

export interface MatchingMemory {
  user_id: string;
  liked_activity_tags: string[];
  disliked_activity_tags: string[];
  preferred_people: string[];
  avoid_people: string[];
  preferred_times: string[];
  preferred_languages: string[];
  hidden_from_matching: string[];
}

export interface RecurringGroup {
  id: string;
  name: string;
  members: string[];
  activity_theme: string;
  rhythm: string;
  next_activity_suggestion: string;
  status: "active" | "paused" | "ended";
}
