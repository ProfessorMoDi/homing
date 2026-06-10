import type { Topic } from "./types";

interface KeywordTopic {
  keys: string[];
  topic: Omit<Topic, "id">;
}

const KEYWORD_TOPICS: KeywordTopic[] = [
  {
    keys: ["catan", "settlers"],
    topic: {
      title: "Settlers of Catan",
      explanation: "You talked about wanting to play Catan again.",
      tags: ["catan", "board games"],
    },
  },
  {
    keys: ["ticket to ride"],
    topic: {
      title: "Ticket to Ride",
      explanation: "You mentioned Ticket to Ride.",
      tags: ["ticket to ride", "board games"],
    },
  },
  {
    keys: ["board game", "boardgame", "tabletop", "monopoly", "risk"],
    topic: {
      title: "Board games",
      explanation: "Board games and casual game nights came up.",
      tags: ["board games"],
    },
  },
  {
    keys: ["chess", "strategy game"],
    topic: {
      title: "Strategy games",
      explanation: "You mentioned strategy thinking and chess-style games.",
      tags: ["strategy games", "chess"],
    },
  },
  {
    keys: ["photography", "photo walk", "camera", "film photo", "analog"],
    topic: {
      title: "Photography",
      explanation: "Photography came up — slow walks, taking pictures.",
      tags: ["photography"],
    },
  },
  {
    keys: ["walk", "walking", "stroll", "wandering"],
    topic: {
      title: "Walking around the city",
      explanation: "You talked about going for walks.",
      tags: ["walks", "outdoors"],
    },
  },
  {
    keys: [" run", "running", "jogging"],
    topic: {
      title: "Running",
      explanation: "Running came up — solo or with someone.",
      tags: ["running", "outdoors"],
    },
  },
  {
    keys: ["techno", "music production", "ableton", "make beats", "dj "],
    topic: {
      title: "Music production",
      explanation: "You talked about making music.",
      tags: ["music production", "techno"],
    },
  },
  {
    keys: ["concert", "gig", "live music"],
    topic: {
      title: "Live music",
      explanation: "Concerts and live music came up.",
      tags: ["live music"],
    },
  },
  {
    keys: ["coffee", "café", "cafe"],
    topic: {
      title: "Cafés and slow mornings",
      explanation: "You mentioned coffee or cafés.",
      tags: ["coffee"],
    },
  },
  {
    keys: ["language exchange", "language café", "language cafe"],
    topic: {
      title: "Language exchange",
      explanation: "You mentioned wanting to practise a language with others.",
      tags: ["language exchange"],
    },
  },
  {
    keys: ["football", "soccer"],
    topic: {
      title: "Football",
      explanation: "Football came up.",
      tags: ["football"],
    },
  },
  {
    keys: ["gym", "workout", "fitness", "lifting"],
    topic: {
      title: "Gym / fitness",
      explanation: "You mentioned the gym.",
      tags: ["gym"],
    },
  },
  {
    keys: ["cook", "cooking", "baking", "dinner party"],
    topic: {
      title: "Cooking",
      explanation: "You talked about cooking.",
      tags: ["cooking"],
    },
  },
  {
    keys: ["ceramic", "pottery", "paint", "crafts", "workshop"],
    topic: {
      title: "Creative workshops",
      explanation: "Hands-on creative work came up.",
      tags: ["creative workshops"],
    },
  },
  {
    keys: ["thursday"],
    topic: {
      title: "Thursday evenings",
      explanation: "Thursday felt like a realistic time for you.",
      tags: ["thursday-evening"],
    },
  },
  {
    keys: ["weekend", "saturday", "sunday"],
    topic: {
      title: "Weekend availability",
      explanation: "You talked about weekend plans.",
      tags: ["weekend"],
    },
  },
  {
    keys: ["small group", "small groups", "intimate", "quiet"],
    topic: {
      title: "Small groups",
      explanation: "You prefer something small over a big event.",
      tags: ["small group", "low-pressure"],
    },
  },
];

const LANG_KEYWORDS: Record<string, string> = {
  english: "English",
  dutch: "Dutch",
  german: "German",
  french: "French",
  spanish: "Spanish",
  italian: "Italian",
  portuguese: "Portuguese",
  arabic: "Arabic",
};

export interface ExtractedProfile {
  topics: Topic[];
  minorInterests: string[];
  languages: string[];
}

export function extractFromTranscript(transcript: string): ExtractedProfile {
  const lower = ` ${transcript.toLowerCase()} `;

  const hits = KEYWORD_TOPICS.filter(({ keys }) =>
    keys.some((k) => lower.includes(k.toLowerCase())),
  );

  const topics: Topic[] = hits.slice(0, 24).map((h, i) => ({
    id: `t_live_${i}`,
    title: h.topic.title,
    explanation: h.topic.explanation,
    tags: h.topic.tags,
  }));

  if (topics.length === 0) {
    const firstSentence =
      transcript.split(/(?<=[.!?])\s+/)[0]?.trim().slice(0, 140) ?? "";
    topics.push({
      id: "t_live_general",
      title: "What HOMING heard",
      explanation:
        firstSentence ||
        "We didn't pick up a specific theme. Try again or load a sample.",
      tags: ["general"],
    });
  }

  const languages = Object.entries(LANG_KEYWORDS)
    .filter(([key]) => lower.includes(key))
    .map(([, label]) => label);

  const minor: string[] = [];
  if (lower.includes("near campus")) minor.push("Near campus");
  if (lower.includes("kralingen")) minor.push("Kralingen area");
  if (lower.includes("coffee")) minor.push("Coffee on the side");
  if (lower.includes("one drink")) minor.push("One drink, low key");
  if (lower.match(/\b(four|4) people/)) minor.push("A group of four feels right");
  if (lower.includes("weekly")) minor.push("Open to making it weekly");

  return {
    topics,
    minorInterests: minor,
    languages,
  };
}
