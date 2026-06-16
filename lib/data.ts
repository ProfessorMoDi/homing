import type { User } from "./types";

export interface SeedUser extends User {
  interests: string[];
  voice_quote: string;
}

export const seedUsers: SeedUser[] = [
  {
    id: "u_franz",
    first_name: "Franz",
    email: "franz@eur.nl",
    age: 24,
    gender: "male",
    gender_preference: "mixed",
    neighbourhood: "Kralingen",
    languages_spoken: ["German", "English"],
    languages_comfortable: ["German", "English"],
    availability: ["thursday-evening", "every-weekend"],
    commitment_appetite: "maybe-weekly",
    verification_status: "verified",
    profile_completed: true,
    interests: ["catan", "board games", "strategy games", "german", "casual games"],
    voice_quote: "I keep coming back to Catan, honestly. Something about a slow Thursday game.",
  },
  {
    id: "u_lena",
    first_name: "Lena",
    email: "lena@eur.nl",
    age: 22,
    gender: "female",
    gender_preference: "mixed",
    neighbourhood: "Centrum",
    languages_spoken: ["German", "English"],
    languages_comfortable: ["English", "German"],
    availability: ["thursday-evening"],
    commitment_appetite: "maybe-weekly",
    verification_status: "verified",
    profile_completed: true,
    interests: ["catan", "board games", "coffee", "study cafés"],
    voice_quote: "Catan with some coffee on the side would actually be perfect.",
  },
  {
    id: "u_mark",
    first_name: "Mark",
    email: "mark@eur.nl",
    age: 26,
    gender: "male",
    gender_preference: "either",
    neighbourhood: "Kralingen",
    languages_spoken: ["English", "Dutch"],
    languages_comfortable: ["English"],
    availability: ["weekday-evenings"],
    commitment_appetite: "regular-thing",
    verification_status: "verified",
    profile_completed: true,
    interests: ["strategy games", "chess", "board games"],
    voice_quote: "Anything strategy — chess, board games. I miss the thinking-out-loud part.",
  },
  {
    id: "u_sara",
    first_name: "Sara",
    email: "sara@eur.nl",
    age: 23,
    gender: "female",
    gender_preference: "mixed",
    neighbourhood: "Kralingen",
    languages_spoken: ["English", "Spanish"],
    languages_comfortable: ["English", "Spanish"],
    availability: ["thursday-evening", "weekday-daytime"],
    commitment_appetite: "try-once",
    verification_status: "verified",
    profile_completed: true,
    interests: ["casual games", "language exchange", "food spots"],
    voice_quote: "I'd be up for a casual game night — nothing too intense though.",
  },
  {
    id: "u_noor",
    first_name: "Noor",
    email: "noor@eur.nl",
    age: 25,
    gender: "female",
    gender_preference: "mixed",
    neighbourhood: "Noord",
    languages_spoken: ["Dutch", "English"],
    languages_comfortable: ["Dutch", "English"],
    availability: ["every-weekend"],
    commitment_appetite: "maybe-weekly",
    verification_status: "verified",
    profile_completed: true,
    interests: ["running", "photography", "weekend walks"],
    voice_quote: "Weekend runs and taking photos along the way — that's my thing right now.",
  },
  {
    id: "u_jonas",
    first_name: "Jonas",
    email: "jonas@eur.nl",
    age: 21,
    gender: "male",
    gender_preference: "mixed",
    neighbourhood: "Delfshaven",
    languages_spoken: ["English", "Dutch"],
    languages_comfortable: ["English"],
    availability: ["weekday-daytime"],
    commitment_appetite: "try-once",
    verification_status: "verified",
    profile_completed: true,
    interests: ["music production", "techno", "ableton"],
    voice_quote: "I make techno alone too much. Would love to bounce ideas with someone.",
  },
  {
    id: "u_emma",
    first_name: "Emma",
    email: "emma@eur.nl",
    age: 27,
    gender: "female",
    gender_preference: "same-gender",
    neighbourhood: "Centrum",
    languages_spoken: ["English"],
    languages_comfortable: ["English"],
    availability: ["every-weekend"],
    commitment_appetite: "maybe-weekly",
    verification_status: "verified",
    profile_completed: true,
    interests: ["ceramics", "creative workshops", "tea"],
    voice_quote: "Anything where my hands are busy and there's tea — ceramics, workshops.",
  },
  {
    id: "u_amir",
    first_name: "Amir",
    email: "amir@eur.nl",
    age: 23,
    gender: "male",
    gender_preference: "mixed",
    neighbourhood: "Centrum",
    languages_spoken: ["English", "Arabic"],
    languages_comfortable: ["English"],
    availability: ["weekday-evenings"],
    commitment_appetite: "regular-thing",
    verification_status: "verified",
    profile_completed: true,
    interests: ["football", "gym", "food", "casual hangouts"],
    voice_quote: "Football, gym, maybe grabbing food after. Active stuff mostly.",
  },
  {
    id: "u_sophie",
    first_name: "Sophie",
    email: "sophie@eur.nl",
    age: 22,
    gender: "female",
    gender_preference: "mixed",
    neighbourhood: "Kralingen",
    languages_spoken: ["English", "French"],
    languages_comfortable: ["English"],
    availability: ["thursday-evening"],
    commitment_appetite: "maybe-weekly",
    verification_status: "verified",
    profile_completed: true,
    interests: ["catan", "ticket to ride", "board games"],
    voice_quote: "Catan, Ticket to Ride — board game nights are kind of my comfort zone.",
  },
  {
    id: "u_david",
    first_name: "David",
    email: "david@eur.nl",
    age: 25,
    gender: "male",
    gender_preference: "mixed",
    neighbourhood: "Noord",
    languages_spoken: ["English", "Dutch"],
    languages_comfortable: ["English", "Dutch"],
    availability: ["thursday-evening"],
    commitment_appetite: "maybe-weekly",
    verification_status: "verified",
    profile_completed: true,
    interests: ["running", "outdoors"],
    voice_quote: "Honestly board games aren't for me. Running and being outside, that's it.",
  },
  {
    id: "u_clara",
    first_name: "Clara",
    email: "clara@eur.nl",
    age: 24,
    gender: "female",
    gender_preference: "mixed",
    neighbourhood: "Centrum",
    languages_spoken: ["German", "English"],
    languages_comfortable: ["German", "English"],
    availability: ["weekday-daytime"],
    commitment_appetite: "maybe-weekly",
    verification_status: "verified",
    profile_completed: true,
    interests: ["language exchange", "cafés", "German-English"],
    voice_quote: "I'd love a relaxed German-English language café on Friday mornings.",
  },
  {
    id: "u_milan",
    first_name: "Milan",
    email: "milan@eur.nl",
    age: 26,
    gender: "male",
    gender_preference: "mixed",
    neighbourhood: "Kralingen",
    languages_spoken: ["English", "Dutch"],
    languages_comfortable: ["English"],
    availability: ["every-weekend"],
    commitment_appetite: "try-once",
    verification_status: "verified",
    profile_completed: true,
    interests: ["film photography", "rotterdam walks", "architecture"],
    voice_quote: "Film photography, Rotterdam side streets, that kind of slow Saturday.",
  },
];

export const findUser = (id: string): SeedUser | undefined =>
  seedUsers.find((u) => u.id === id);

export const sampleVoiceTranscript = `So, um… where do I even start. I moved to Rotterdam about eight months ago for EUR — I'm in my third year now — and I kind of assumed that by this point I'd have a normal rhythm. But honestly most days I'm just bouncing between my room in Kralingen and the library, and I don't really know how people here actually build a social life without it feeling like networking or something.

Back home in Munich I had this Thursday thing with my brother and two friends from school — we'd play Catan, eat crisps, complain about sheep, nothing serious. I miss that stupid slow evening. I'd love one proper round again. Ticket to Ride is fine too. I am not looking for one of those massive game nights with twelve strangers. That sounds exhausting.

I've also gotten into film photography this year — actual film, not just my phone. I walk a lot. Kralingse Bos when the light is good, the harbour around golden hour, random side streets near campus. Mostly alone because I don't really know who to ask along. A slow Saturday walk with two or three people who are okay with quiet would be perfect.

Cooking is another thing I keep circling. I make a lot of Asian food — ramen, dumplings — but always just for myself, and it feels silly. I'd love to cook with people once. Shop together in the morning, cook in the afternoon, eat. I have a decent kitchen near campus in Kralingen, so somewhere close works.

Language-wise I'm completely fine in English, German is my first language, and my Dutch is still rough — I understand more than I speak. Weekday evenings are hit or miss because of classes, but Thursday evenings are usually free. Weekends I sometimes go see family but not every week — I'm pretty flexible otherwise.

I'm not trying to find a best-friend group or anything intense. Just something low-pressure. Try it once, see if it feels normal. Maybe it becomes a regular thing if it clicks. Four people max — I hate when groups get huge.

I keep walking past the Erasmusbrug on my way home thinking I should actually do the stuff I already enjoy, with other people who enjoy it too. That's basically it. I don't know — I'm a bit lost here, but I'm trying.`;

export const sampleMainTopics = [
  {
    id: "t_catan",
    title: "Catan",
    explanation:
      "You miss the slow Thursday Catan evenings you had back home in Munich.",
    tags: ["catan", "board games", "thursday-evening"],
  },
  {
    id: "t_boardgames",
    title: "Board games",
    explanation:
      "Ticket to Ride and casual strategy games came up — small groups only.",
    tags: ["board games", "strategy games", "ticket to ride"],
  },
  {
    id: "t_film",
    title: "Film photography",
    explanation:
      "You shoot on actual film and walk for light — Kralingse Bos, the harbour.",
    tags: ["film photography", "photography", "golden hour"],
  },
  {
    id: "t_walks",
    title: "Rotterdam walks",
    explanation:
      "Slow Saturday walks near campus — you'd like quiet company, not a big group.",
    tags: ["rotterdam walks", "weekend walks", "kralingen"],
  },
  {
    id: "t_cooking",
    title: "Cooking together",
    explanation:
      "You cook Asian food alone too often and want to shop and cook with others.",
    tags: ["cooking", "asian food", "ramen"],
  },
  {
    id: "t_smallgroup",
    title: "Small groups",
    explanation:
      "Four people max — you find large meetups exhausting.",
    tags: ["small group", "low-pressure"],
  },
];

export const sampleMinorInterests = [
  "Misses Munich Thursday routine",
  "Erasmusbrug walks on the way home",
  "Dutch still rough but improving",
  "Coffee after activities",
  "Shop together then cook",
  "Not looking for networking vibes",
];

export const sampleActivityTypes = [
  "Low-pressure first meeting",
  "Sit-down",
  "Games",
  "Creative",
  "Outdoors",
];

// Three hardcoded activity suggestions matched to the sample voice
// transcript. Pre-seeded into the suggestions cache at module load so the
// demo path never hits the LLM — saves credits and avoids failures on
// transient API outages. Live (non-sample) recordings still call the API.
//
// The shape matches RawSuggestedActivity in lib/suggestionsCache.ts; we keep
// this declaration type-free so that file stays the single source of truth.
export const sampleSuggestedActivities = [
  {
    title: "Start a Catan round",
    description:
      "One slow Thursday Catan game near campus — crisps, no competitiveness.",
    day: "Thursday",
    time: "19:30",
    duration: "1.5 hours",
    location_area: "Near EUR campus",
    exact_venue: "Boardroom Café · Honingerdijk",
    group_size_target: 4,
    language: "English",
    energy_level: "Low-pressure / structured",
    specific_interest_tags: ["catan"],
    broader_interest_tags: ["board games", "strategy games"],
    reason:
      "You talked about missing your Munich Thursday Catan routine — this is that, here.",
  },
  {
    title: "Saturday film photo walk",
    description:
      "Slow walk through Kralingse Bos with cameras, quiet company welcome.",
    day: "Saturday",
    time: "16:00",
    duration: "2 hours",
    location_area: "Kralingen",
    exact_venue: "Kralingse Plas, west entrance",
    group_size_target: 4,
    language: "English",
    energy_level: "Relaxed",
    specific_interest_tags: ["film photography"],
    broader_interest_tags: ["photography", "walks"],
    reason:
      "You mentioned golden-hour walks and not minding silence — same energy.",
  },
  {
    title: "Cook ramen together",
    description:
      "Shop together, cook from scratch in a Kralingen kitchen, eat.",
    day: "Saturday",
    time: "14:00",
    duration: "3 hours",
    location_area: "Kralingen",
    exact_venue: "Host flat near campus",
    group_size_target: 4,
    language: "English",
    energy_level: "Creative",
    specific_interest_tags: ["cooking", "ramen"],
    broader_interest_tags: ["asian food", "food"],
    reason:
      "You said cooking alone feels silly and you want to do it with people once.",
  },
];

// Profile hints embedded in the sample transcript — pre-fill the gap-filler
// when the user taps "Use sample recording" so voice-first onboarding skips
// languages, availability, and commitment questions.
export const sampleVoiceSignupHints = {
  languages_spoken: ["English", "German", "Dutch"],
  languages_comfortable: ["English", "German"],
  availability: ["thursday-evening", "weekday-evenings", "flexible"],
  commitment: "maybe-weekly",
} as const;
