// Canonical interest taxonomy. The single source of truth for:
//   • which Topic ids are "real" (vs LLM-emitted noise),
//   • how interests are related to each other (used for graph expansion),
//   • how free-text neighbourhood labels collapse onto Rotterdam areas.
//
// Why hand-curated and not LLM-built: deterministic, debuggable, zero runtime
// cost. Twelve seed users and ~30 interest clusters fits comfortably in a flat
// file. When the catalogue grows past ~200 topics we can promote a portion of
// this into a one-shot LLM ontology pass (cached to disk), but for now manual
// curation is faster, cheaper, and trivially auditable.

// ── Topics ────────────────────────────────────────────────────────────────────

export type TopicEdgeKind = "broader" | "sibling" | "adjacent";

export interface TopicDef {
  title: string;
  // Broader / parent concepts. Edge weight 0.6 (Catan -> board-games).
  parents?: string[];
  // Conceptual siblings. Edge weight 0.5 (board-games <-> strategy-games).
  siblings?: string[];
  // Loosely adjacent concepts. Edge weight 0.3 (photography <-> walking).
  adjacent?: string[];
}

export const EDGE_WEIGHT: Record<TopicEdgeKind, number> = {
  broader: 0.6,
  sibling: 0.5,
  adjacent: 0.3,
};

// Canonical id -> definition. Ids are the slugified, plural, lowercase form
// (e.g. "board-games" not "board-game" or "boardgame"). All aliases must
// resolve to one of these ids via TOPIC_ALIASES below.
export const CANONICAL_TOPICS: Record<string, TopicDef> = {
  // ─ Games ────────────────────────────────────────────────────────────────
  "games": { title: "Games" },
  "board-games": {
    title: "Board games",
    parents: ["games"],
    siblings: ["strategy-games", "casual-games"],
  },
  "strategy-games": {
    title: "Strategy games",
    parents: ["games"],
    siblings: ["board-games"],
  },
  "casual-games": {
    title: "Casual games",
    parents: ["games"],
    siblings: ["board-games"],
  },
  "catan": { title: "Catan", parents: ["board-games", "strategy-games"] },
  "ticket-to-ride": {
    title: "Ticket to Ride",
    parents: ["board-games", "strategy-games"],
  },
  "chess": { title: "Chess", parents: ["strategy-games"] },

  // ─ Movement / outdoors ─────────────────────────────────────────────────
  "fitness": { title: "Fitness" },
  "running": { title: "Running", parents: ["fitness", "outdoors"] },
  "gym": { title: "Gym", parents: ["fitness"] },
  "football": { title: "Football", parents: ["fitness"], siblings: ["gym"] },
  "outdoors": { title: "Outdoors" },
  "walking": {
    title: "Walking",
    parents: ["outdoors"],
    adjacent: ["photography"],
  },
  "weekend-walks": { title: "Weekend walks", parents: ["walking"] },
  "rotterdam-walks": {
    title: "Rotterdam walks",
    parents: ["walking"],
    adjacent: ["architecture", "photography"],
  },

  // ─ Photography & creative ──────────────────────────────────────────────
  "photography": {
    title: "Photography",
    adjacent: ["walking", "rotterdam-walks", "architecture"],
  },
  "film-photography": { title: "Film photography", parents: ["photography"] },
  "architecture": { title: "Architecture", adjacent: ["photography", "rotterdam-walks"] },
  "urban-exploration": {
    title: "Urban exploration",
    parents: ["walking", "outdoors"],
    adjacent: ["photography", "architecture"],
  },

  // ─ Food / cafés ────────────────────────────────────────────────────────
  "food": { title: "Food" },
  "food-spots": { title: "Food spots", parents: ["food"] },
  "cooking": { title: "Cooking", parents: ["food"] },
  "cafes": {
    title: "Cafés",
    siblings: ["coffee", "tea"],
    adjacent: ["study-cafes"],
  },
  "study-cafes": { title: "Study cafés", parents: ["cafes"] },
  "coffee": { title: "Coffee", parents: ["cafes"] },
  "tea": { title: "Tea", parents: ["cafes"] },

  // ─ Music ───────────────────────────────────────────────────────────────
  "music": { title: "Music" },
  "music-production": {
    title: "Music production",
    parents: ["music"],
    adjacent: ["ableton"],
  },
  "techno": { title: "Techno", parents: ["music"] },
  "ableton": { title: "Ableton", parents: ["music-production"] },

  // ─ Crafts ──────────────────────────────────────────────────────────────
  "crafts": { title: "Crafts" },
  "ceramics": { title: "Ceramics", parents: ["crafts"] },
  "creative-workshops": {
    title: "Creative workshops",
    parents: ["crafts"],
    adjacent: ["ceramics"],
  },

  // ─ Language / social ───────────────────────────────────────────────────
  "language-exchange": {
    title: "Language exchange",
    adjacent: ["cafes"],
  },
  "casual-hangouts": { title: "Casual hangouts" },
  "social": { title: "Social", siblings: ["casual-hangouts"] },
};

// Free-text variants that should collapse to a canonical id. Keep entries
// lowercase; the resolver lowercases input. Singular/plural and obvious
// variants are most of what we need — the LLM emits these constantly.
export const TOPIC_ALIASES: Record<string, string> = {
  // games
  "board game": "board-games",
  "boardgame": "board-games",
  "boardgames": "board-games",
  "tabletop game": "board-games",
  "tabletop games": "board-games",
  "settlers of catan": "catan",
  "settlers": "catan",
  "strategy game": "strategy-games",
  "casual game": "casual-games",
  "casual gaming": "casual-games",
  "game night": "casual-games",
  "game nights": "casual-games",

  // outdoors / movement
  "weekend walk": "weekend-walks",
  "rotterdam walk": "rotterdam-walks",
  "city walks": "rotterdam-walks",
  "city walking": "walking",
  "walks": "walking",
  "hiking": "walking",
  "jogging": "running",
  "morning runs": "running",
  "morning run": "running",
  "5k": "running",
  "5km": "running",
  "trail running": "running",
  "easy runs": "running",

  // photography
  "photo": "photography",
  "photos": "photography",
  "photo walk": "rotterdam-walks",
  "photo walks": "rotterdam-walks",
  "film camera": "film-photography",
  "street photography": "photography",
  "analog photography": "film-photography",
  "analogue photography": "film-photography",

  // food / cafés
  "café": "cafes",
  "cafe": "cafes",
  "study café": "study-cafes",
  "study cafe": "study-cafes",
  "study cafés": "study-cafes",
  "coffee shop": "cafes",
  "coffee shops": "cafes",
  "food spot": "food-spots",
  "cooking together": "cooking",
  "cook": "cooking",

  // music
  "producing music": "music-production",
  "making music": "music-production",
  "music making": "music-production",
  "electronic music": "techno",

  // crafts
  "ceramic": "ceramics",
  "pottery": "ceramics",
  "creative workshop": "creative-workshops",
  "workshops": "creative-workshops",

  // social / language
  "language café": "language-exchange",
  "language cafe": "language-exchange",
  "language-exchange": "language-exchange",
  "german-english": "language-exchange",
  "casual hangout": "casual-hangouts",
  "hangout": "casual-hangouts",
  "hangouts": "casual-hangouts",
  "social hangouts": "casual-hangouts",

  // misc cleanup
  "outdoor": "outdoors",
  "fitness training": "fitness",
};

// Slugifies a raw string the same way the previous slugify did, but with
// canonical alias resolution layered on top.
function rawSlug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export interface CanonicalTopic {
  id: string;
  title: string;
  canonical: boolean; // true if matched a known canonical id (directly or via alias)
}

// Resolve a raw interest/tag string to a canonical topic.
// Lookup order:
//   1. trimmed lowercase exact alias hit
//   2. slugified alias hit (handles "Board Game" -> "board-game" -> alias)
//   3. slugified matches an existing canonical id
//   4. otherwise, return the slug as-is and mark canonical=false (it'll still
//      be a Topic node in the graph, just unlinked from the ontology)
export function canonicalizeTopic(raw: string): CanonicalTopic {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return { id: "", title: "", canonical: false };

  const aliasHit = TOPIC_ALIASES[cleaned];
  if (aliasHit && CANONICAL_TOPICS[aliasHit]) {
    return { id: aliasHit, title: CANONICAL_TOPICS[aliasHit].title, canonical: true };
  }

  const slug = rawSlug(raw);
  const slugAliasHit = TOPIC_ALIASES[slug.replace(/-/g, " ")];
  if (slugAliasHit && CANONICAL_TOPICS[slugAliasHit]) {
    return { id: slugAliasHit, title: CANONICAL_TOPICS[slugAliasHit].title, canonical: true };
  }

  if (CANONICAL_TOPICS[slug]) {
    return { id: slug, title: CANONICAL_TOPICS[slug].title, canonical: true };
  }

  // Unknown topic: keep the slug so the graph still gets a Topic node.
  // Title falls back to the raw string in Title-ish case.
  return { id: slug, title: raw.trim(), canonical: false };
}

// ── Neighbourhoods ────────────────────────────────────────────────────────────

export interface NeighbourhoodDef {
  // Canonical display name (Title Case). The id is the slugified form.
  name: string;
  // Lowercase free-text aliases / fuzzy matches.
  aliases: string[];
}

export const NEIGHBOURHOODS: Record<string, NeighbourhoodDef> = {
  "kralingen": {
    name: "Kralingen",
    aliases: [
      "near eur campus",
      "near eur",
      "eur campus",
      "near campus",
      "by campus",
      "kralingen-crooswijk",
      "kralingse plas",
      "kralingse bos",
    ],
  },
  "centrum": {
    name: "Centrum",
    aliases: ["city centre", "city center", "downtown", "centrum rotterdam"],
  },
  "noord": {
    name: "Noord",
    aliases: ["rotterdam noord", "north", "rotterdam north"],
  },
  "delfshaven": {
    name: "Delfshaven",
    aliases: ["historic delfshaven", "delfshaven rotterdam"],
  },
  "hillegersberg": {
    name: "Hillegersberg",
    aliases: ["hillegersberg-schiebroek", "bergse plas"],
  },
  "charlois": { name: "Charlois", aliases: ["zuidwijk"] },
  "feijenoord": { name: "Feijenoord", aliases: ["kop van zuid", "katendrecht"] },
};

// Precompute alias -> canonical-name lookup once.
const NEIGHBOURHOOD_INDEX: Record<string, string> = (() => {
  const idx: Record<string, string> = {};
  for (const [, def] of Object.entries(NEIGHBOURHOODS)) {
    idx[def.name.toLowerCase()] = def.name;
    for (const alias of def.aliases) idx[alias.toLowerCase()] = def.name;
  }
  return idx;
})();

// Returns canonical neighbourhood name, or the trimmed input if unknown.
// Never returns null — the graph still stores something useful for unknowns.
export function canonicalizeNeighbourhood(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw.trim();
  if (!cleaned) return "";
  const lookup = NEIGHBOURHOOD_INDEX[cleaned.toLowerCase()];
  if (lookup) return lookup;

  // Substring fallback: if the raw text contains a known alias/name as a
  // whole word, use that. Handles "Café in Kralingen near campus" etc.
  const lowered = cleaned.toLowerCase();
  for (const [alias, canonical] of Object.entries(NEIGHBOURHOOD_INDEX)) {
    if (alias.length < 4) continue; // skip short tokens to avoid false hits
    if (lowered.includes(alias)) return canonical;
  }

  return cleaned;
}

// Convenience for debug endpoints.
export function listTaxonomy() {
  return {
    topics: Object.entries(CANONICAL_TOPICS).map(([id, def]) => ({
      id,
      title: def.title,
      parents: def.parents ?? [],
      siblings: def.siblings ?? [],
      adjacent: def.adjacent ?? [],
    })),
    aliases: TOPIC_ALIASES,
    neighbourhoods: Object.values(NEIGHBOURHOODS).map((n) => ({
      name: n.name,
      aliases: n.aliases,
    })),
  };
}
