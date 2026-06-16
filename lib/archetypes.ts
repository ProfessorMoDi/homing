// Hand-curated pool of EUR-student personas. When a user skips a step,
// pickArchetype() returns one of these so the graph still gets plausible
// data. Each archetype names one of five pre-canned transcript variants so
// the voice/themes path also has something to chew on.
//
// Deterministic, zero LLM cost, demo-safe. Edit this file directly to add
// or tune personas.

import type { Topic } from "./types";

export type TranscriptVariantId =
  | "board-games"
  | "photo-walks"
  | "running"
  | "music-production"
  | "cooking";

export interface TranscriptVariant {
  id: TranscriptVariantId;
  transcript: string;
  // Pre-extracted topics so the demo doesn't have to call /api/analyze.
  topics: Omit<Topic, "id">[];
  minor_interests: string[];
  activity_types: string[];
  // Suggested activities to seed straight into state.
  activities: Array<{
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
  }>;
}

export const TRANSCRIPT_VARIANTS: Record<TranscriptVariantId, TranscriptVariant> = {
  "board-games": {
    id: "board-games",
    transcript:
      "Honestly the thing I keep coming back to is Catan. I used to play it constantly back home and I miss the slow Thursday evening vibe of just sitting around the board with snacks. I'm in Kralingen so anywhere near the EUR campus is easy for me. I'd want it small, like four people, English is fine but German also works. Low-pressure, just one round to see how it feels. On weekends I also like wandering around with my camera doing photography — not anything intense, just walking and looking for nice light.",
    topics: [
      { title: "Catan", explanation: "Wants a slow Thursday round with snacks, low-pressure.", tags: ["catan", "board games", "thursday-evening"] },
      { title: "Photography", explanation: "Camera walks on weekends, just looking for nice light.", tags: ["photography", "weekend walks"] },
    ],
    minor_interests: ["Snacks while playing", "Small group of four", "Near EUR campus"],
    activity_types: ["Low-pressure first meeting", "Games", "Sit-down"],
    activities: [
      {
        title: "Start a Catan round",
        description: "One game of Catan on a Thursday evening, low-pressure, near campus.",
        day: "Thursday", time: "19:30", duration: "1.5 hours",
        location_area: "Near EUR campus", exact_venue: "Boardroom Café · Honingerdijk",
        group_size_target: 4, language: "English", energy_level: "Low-pressure / structured",
        specific_interest_tags: ["catan"], broader_interest_tags: ["board games", "strategy games"],
        reason: "You talked about wanting a slow Thursday Catan round again.",
      },
    ],
  },
  "photo-walks": {
    id: "photo-walks",
    transcript:
      "I think what I'm actually craving is just slow Saturdays. I picked up a film camera last year and I love wandering through Rotterdam looking for interesting buildings and side streets. Kralingse Bos when the light is good, or the harbour at golden hour. I'd love to do it with two or three other people who don't mind walking quietly for an hour. I speak Dutch and English, comfortable in both. Coffee after is a bonus, not the point. Weekends only, weekdays are full with classes.",
    topics: [
      { title: "Film photography", explanation: "Picked up a film camera, wandering for light and architecture.", tags: ["film photography", "photography"] },
      { title: "Rotterdam walks", explanation: "Slow walks through the city — bos, harbour, side streets.", tags: ["rotterdam walks", "weekend walks", "architecture"] },
    ],
    minor_interests: ["Golden hour", "Quiet company", "Coffee after"],
    activity_types: ["Outdoors", "Creative", "Relaxed"],
    activities: [
      {
        title: "Saturday photo walk",
        description: "Slow walk through Kralingse Bos with cameras, ending at a café.",
        day: "Saturday", time: "16:00", duration: "2 hours",
        location_area: "Kralingen", exact_venue: "Kralingse Plas, west entrance",
        group_size_target: 4, language: "English", energy_level: "Relaxed",
        specific_interest_tags: ["photography"], broader_interest_tags: ["walks", "outdoors"],
        reason: "You mentioned golden hour walks and not minding quiet company.",
      },
    ],
  },
  "running": {
    id: "running",
    transcript:
      "I run a lot, mostly along the Maas in the early mornings before classes. I'd love to find one or two people who can keep a steady 5km pace, nothing too fast. Tuesdays and Thursdays at like 7am would be perfect. I'm in Noord so meeting at the Erasmusbrug works. After running I usually grab a coffee and a baguette somewhere, that's the social part for me. English only, my Dutch is still rough. Open to making it a regular thing if the energy is right.",
    topics: [
      { title: "Running", explanation: "Morning 5km along the Maas, steady pace.", tags: ["running", "fitness", "morning"] },
      { title: "Coffee after", explanation: "Coffee and a baguette is the social part.", tags: ["coffee", "cafés"] },
    ],
    minor_interests: ["7am starts", "Steady pace", "Maas route"],
    activity_types: ["Active", "Routine", "Outdoors"],
    activities: [
      {
        title: "Maas morning run",
        description: "Steady 5km along the Maas, coffee at the end.",
        day: "Tuesday", time: "07:00", duration: "1 hour",
        location_area: "Centrum", exact_venue: "Erasmusbrug · north end",
        group_size_target: 3, language: "English", energy_level: "Active",
        specific_interest_tags: ["running"], broader_interest_tags: ["fitness", "outdoors"],
        reason: "You said Tuesdays/Thursdays at 7am along the Maas would be perfect.",
      },
    ],
  },
  "music-production": {
    id: "music-production",
    transcript:
      "I make techno in Ableton, mostly alone in my room and it's getting boring. I'd love to find two or three people who also produce, even at very different levels, just to share what we're working on. Friday afternoons would be ideal, somewhere with monitors or just listening on headphones together. I'm in Delfshaven near WORM, that area is full of studios. English works, French if anyone speaks it. Not a jam, more a 'show me what you're working on and let's talk it through' kind of session.",
    topics: [
      { title: "Music production", explanation: "Solo techno producer in Ableton, wants others to share with.", tags: ["music production", "techno", "ableton"] },
      { title: "Studio sessions", explanation: "Friday afternoons around WORM, listening and talking through tracks.", tags: ["studio", "friday-afternoon"] },
    ],
    minor_interests: ["Ableton", "Friday afternoons", "WORM area"],
    activity_types: ["Creative", "Collaborative", "Sit-down"],
    activities: [
      {
        title: "Bedroom-producer share",
        description: "Two hours, three people, share what you're working on. No jam.",
        day: "Friday", time: "14:00", duration: "2 hours",
        location_area: "Delfshaven", exact_venue: "WORM Sound Studio",
        group_size_target: 4, language: "English", energy_level: "Creative",
        specific_interest_tags: ["music production", "techno"], broader_interest_tags: ["music"],
        reason: "You wanted a 'show me what you're working on' session, not a jam.",
      },
    ],
  },
  "cooking": {
    id: "cooking",
    transcript:
      "I love cooking but I rarely cook for more than myself, which feels like a waste. I'd want to find people who want to actually cook together — pick a cuisine, shop in the morning, cook in the afternoon, eat. Asian food especially, ramen, dumplings, that level of complexity. Saturdays. I have a decent kitchen in Centrum so we can do it at mine. Dutch, English, both fine. Honestly I just want the kitchen to feel like a place where things happen.",
    topics: [
      { title: "Cooking together", explanation: "Wants to cook with people, not just for self.", tags: ["cooking", "food"] },
      { title: "Asian food", explanation: "Ramen, dumplings, that level of complexity.", tags: ["asian food", "food spots"] },
    ],
    minor_interests: ["Saturday cook", "Decent kitchen", "Shop together"],
    activity_types: ["Creative", "Sit-down", "Sustained"],
    activities: [
      {
        title: "Cook ramen together",
        description: "Shop together in the morning, cook from scratch, eat.",
        day: "Saturday", time: "14:00", duration: "4 hours",
        location_area: "Centrum", exact_venue: "Host's flat near Markthal",
        group_size_target: 4, language: "English", energy_level: "Creative",
        specific_interest_tags: ["cooking"], broader_interest_tags: ["food"],
        reason: "You wanted the kitchen to feel like a place where things happen.",
      },
    ],
  },
};

export interface Archetype {
  first_name: string;
  age: number;
  gender: "male" | "female" | "non-binary";
  gender_pref: "mixed" | "same-gender" | "either";
  neighbourhood: string;
  postcode: string;
  languages_spoken: string[];
  languages_comfortable: string[];
  availability: string[];
  commitment: "try-once" | "maybe-weekly" | "regular-thing" | "open-ended";
  transcript_id: TranscriptVariantId;
}

// 15 EUR-student personas. Distribution: neighbourhoods spread across
// Rotterdam, language mix, all five transcript variants represented.
export const ARCHETYPES: Archetype[] = [
  { first_name: "Aleksa", age: 22, gender: "non-binary", gender_pref: "mixed",
    neighbourhood: "Kralingen", postcode: "3062",
    languages_spoken: ["English", "Dutch"], languages_comfortable: ["English"],
    availability: ["thursday-evening", "every-weekend"], commitment: "maybe-weekly",
    transcript_id: "board-games" },
  { first_name: "Bilal", age: 24, gender: "male", gender_pref: "mixed",
    neighbourhood: "Centrum", postcode: "3011",
    languages_spoken: ["English", "Arabic"], languages_comfortable: ["English"],
    availability: ["weekday-evenings"], commitment: "regular-thing",
    transcript_id: "running" },
  { first_name: "Charlotte", age: 23, gender: "female", gender_pref: "mixed",
    neighbourhood: "Centrum", postcode: "3014",
    languages_spoken: ["English", "French"], languages_comfortable: ["English", "French"],
    availability: ["weekday-daytime", "every-weekend"], commitment: "try-once",
    transcript_id: "music-production" },
  { first_name: "Daniil", age: 25, gender: "male", gender_pref: "mixed",
    neighbourhood: "Delfshaven", postcode: "3024",
    languages_spoken: ["English", "Russian"], languages_comfortable: ["English"],
    availability: ["weekday-daytime"], commitment: "try-once",
    transcript_id: "music-production" },
  { first_name: "Eva", age: 21, gender: "female", gender_pref: "mixed",
    neighbourhood: "Kralingen", postcode: "3063",
    languages_spoken: ["Dutch", "English"], languages_comfortable: ["Dutch", "English"],
    availability: ["every-weekend"], commitment: "maybe-weekly",
    transcript_id: "photo-walks" },
  { first_name: "Farid", age: 26, gender: "male", gender_pref: "either",
    neighbourhood: "Noord", postcode: "3037",
    languages_spoken: ["English", "Dutch"], languages_comfortable: ["English"],
    availability: ["weekday-evenings", "every-weekend"], commitment: "regular-thing",
    transcript_id: "running" },
  { first_name: "Greta", age: 24, gender: "female", gender_pref: "same-gender",
    neighbourhood: "Centrum", postcode: "3013",
    languages_spoken: ["German", "English"], languages_comfortable: ["German", "English"],
    availability: ["every-weekend"], commitment: "maybe-weekly",
    transcript_id: "cooking" },
  { first_name: "Henrik", age: 23, gender: "male", gender_pref: "mixed",
    neighbourhood: "Kralingen", postcode: "3061",
    languages_spoken: ["English", "Swedish"], languages_comfortable: ["English"],
    availability: ["thursday-evening"], commitment: "maybe-weekly",
    transcript_id: "board-games" },
  { first_name: "Iris", age: 22, gender: "female", gender_pref: "mixed",
    neighbourhood: "Noord", postcode: "3036",
    languages_spoken: ["Dutch", "English"], languages_comfortable: ["Dutch", "English"],
    availability: ["every-weekend"], commitment: "maybe-weekly",
    transcript_id: "photo-walks" },
  { first_name: "Joon", age: 25, gender: "male", gender_pref: "mixed",
    neighbourhood: "Centrum", postcode: "3012",
    languages_spoken: ["English", "Korean"], languages_comfortable: ["English"],
    availability: ["every-weekend"], commitment: "regular-thing",
    transcript_id: "cooking" },
  { first_name: "Klara", age: 24, gender: "female", gender_pref: "mixed",
    neighbourhood: "Hillegersberg", postcode: "3054",
    languages_spoken: ["German", "English"], languages_comfortable: ["German", "English"],
    availability: ["weekday-daytime"], commitment: "maybe-weekly",
    transcript_id: "cooking" },
  { first_name: "Lukas", age: 26, gender: "male", gender_pref: "mixed",
    neighbourhood: "Delfshaven", postcode: "3025",
    languages_spoken: ["German", "English"], languages_comfortable: ["English"],
    availability: ["weekday-evenings"], commitment: "try-once",
    transcript_id: "music-production" },
  { first_name: "Mei", age: 22, gender: "female", gender_pref: "mixed",
    neighbourhood: "Kralingen", postcode: "3062",
    languages_spoken: ["English", "Mandarin"], languages_comfortable: ["English"],
    availability: ["thursday-evening", "every-weekend"], commitment: "maybe-weekly",
    transcript_id: "board-games" },
  { first_name: "Niko", age: 25, gender: "male", gender_pref: "mixed",
    neighbourhood: "Centrum", postcode: "3015",
    languages_spoken: ["English", "Greek"], languages_comfortable: ["English"],
    availability: ["weekday-evenings"], commitment: "regular-thing",
    transcript_id: "running" },
  { first_name: "Olivia", age: 23, gender: "female", gender_pref: "mixed",
    neighbourhood: "Centrum", postcode: "3011",
    languages_spoken: ["English", "Italian"], languages_comfortable: ["English"],
    availability: ["every-weekend"], commitment: "open-ended",
    transcript_id: "photo-walks" },
];

// Pick one archetype at random. Optional preferred variant lets us steer
// the demo toward a specific transcript when needed.
export function pickArchetype(opts?: { variant?: TranscriptVariantId }): Archetype {
  const pool = opts?.variant
    ? ARCHETYPES.filter((a) => a.transcript_id === opts.variant)
    : ARCHETYPES;
  const chosen = pool[Math.floor(Math.random() * pool.length)] ?? ARCHETYPES[0];
  return chosen;
}

// Patch only fields the user hasn't already filled. Returns the Signup
// patch that should be merged into state via setSignup().
export interface SignupPatch {
  first_name?: string;
  age?: number;
  gender?: string;
  gender_pref?: string;
  postcode?: string;
  languages_spoken?: string[];
  languages_comfortable?: string[];
  availability?: string[];
  commitment?: string;
  email?: string;
}

export function fillSignupGaps(
  current: {
    first_name?: string;
    email?: string;
    age?: number | null;
    gender?: string;
    gender_pref?: string;
    postcode?: string;
    languages_spoken?: string[];
    languages_comfortable?: string[];
    availability?: string[];
    commitment?: string;
  },
  archetype: Archetype = pickArchetype(),
): SignupPatch {
  const patch: SignupPatch = {};
  if (!current.first_name) patch.first_name = archetype.first_name;
  if (current.age == null) patch.age = archetype.age;
  if (!current.gender) patch.gender = archetype.gender;
  if (!current.postcode) patch.postcode = archetype.postcode;
  if (!current.languages_spoken?.length) patch.languages_spoken = archetype.languages_spoken;
  if (!current.languages_comfortable?.length) patch.languages_comfortable = archetype.languages_comfortable;
  if (!current.availability?.length) patch.availability = archetype.availability;
  if (!current.commitment) patch.commitment = archetype.commitment;
  if (!current.email && patch.first_name) {
    patch.email = `${slug(patch.first_name)}.demo@eur.nl`;
  }
  return patch;
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Random rating helper for feedback skip — 3, 4 or 5.
export function randomPositiveRating(): number {
  return 3 + Math.floor(Math.random() * 3);
}

// Rotterdam postcode prefix → neighbourhood. The graph's neighbourhood
// canonicaliser handles aliases; this maps a typed postcode to a candidate
// neighbourhood the user probably lives in.
const POSTCODE_TO_NEIGHBOURHOOD: Array<[RegExp, string]> = [
  [/^301[1-5]/, "Centrum"],
  [/^302[1-9]/, "Delfshaven"],
  [/^303[1-9]/, "Noord"],
  [/^305[1-9]/, "Hillegersberg"],
  [/^306[1-9]/, "Kralingen"],
  [/^307[1-9]/, "Feijenoord"],
  [/^308[1-9]/, "Charlois"],
];

export function postcodeToNeighbourhood(postcode: string | undefined): string | undefined {
  if (!postcode) return undefined;
  const trimmed = postcode.trim().replace(/\s+/g, "");
  for (const [re, name] of POSTCODE_TO_NEIGHBOURHOOD) {
    if (re.test(trimmed)) return name;
  }
  return undefined;
}
