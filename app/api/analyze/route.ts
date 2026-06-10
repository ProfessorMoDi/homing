import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You analyze a voice transcript from HOMING, an app that turns a young adult's interests into a small, low-pressure real-life activity in Rotterdam, Netherlands. The user is a student at Erasmus University Rotterdam (EUR).

Return a strict JSON object with exactly these fields.

1) topics — EVERY distinct interest the speaker actually mentioned. Do NOT cap
   this artificially — if they mention many things, return many (15–20+ is
   completely fine). The user should feel that nothing they said was missed.
   Each item is an object:
   - title: 1–4 word phrase (Title Case)
   - explanation: one short sentence paraphrasing what they said about it
   - tags: 2–5 lowercase keyword tags

   CRITICAL: One topic = one distinct, atomic concept. Do NOT bundle separable
   interests under a single topic. Each should stand on its own so it can be
   independently kept, edited, or removed. If they mention several varieties of
   one thing — e.g. salsa AND bachata AND hip-hop dancing; or Korean AND Thai
   food — make EACH variety its own topic. Never collapse them into one.
   - "Cooking" and "Asian food" are TWO topics. Cooking is a craft; Asian
     food is a cuisine. Someone who cooks may cook many cuisines.
   - "Running" and "morning routines" are TWO topics.
   - "Photography" and "wandering Rotterdam" are TWO topics.
   - "Board games" and "Catan" are TWO topics ("Catan" is more specific).
   - "Music" and "techno" are TWO topics; "Music production" is yet another.
   - Each topic's tags should only describe THAT topic — never mix tags from
     other concepts.

2) minor_interests — up to 12 short phrases capturing every smaller detail,
   preference, or constraint they mentioned (favourite spots, group-size
   preference, vibe, foods, specific names, times of day, etc.). Only things
   they actually said.

3) languages — language names in Title Case the speaker EXPLICITLY said they
   speak or are comfortable using. Only include a language they clearly stated.
   NEVER infer a language from where they live, and never assume English,
   Dutch, or German unless they said it. If none stated, return [].

4) activity_types — 2–4 short style descriptors (e.g. "sit-down", "creative", "low-pressure first meeting", "outdoors", "structured", "games", "language exchange").

5b) availability — array of zero or more tokens, chosen ONLY from this exact set, describing when the speaker said they are usually free:
   "every-weekend", "weekday-evenings", "thursday-evening", "friday-morning", "flexible".
   Capture what they ACTUALLY said, mapped to the closest token — but never add a specific day or time they did not name:
   - "weekend(s)" / "Saturdays" / "Sundays" → "every-weekend"
   - generic "evenings" / "after work" / "weeknights" → "weekday-evenings" (do NOT upgrade this to "thursday-evening")
   - they explicitly name Thursday evening → "thursday-evening"
   - "Friday morning/afternoon" → "friday-morning"
   - "flexible" / "anytime" / "whenever" → "flexible"
   Include only what they clearly said. If they mention timing that fits nothing here, still capture it in minor_interests. If no availability is mentioned, return [].

5c) commitment — a single token, chosen ONLY from this exact set, capturing how much they want to commit:
   "try-once" (just see how it feels / one time), "maybe-weekly" (maybe make it weekly), "regular-thing" (wants a regular/ongoing thing), "open-ended" (no fixed cadence). If unclear, return "".

5) activities — concrete activity suggestions, one or more for as many of their
   interests as you can. MORE IS BETTER — if they mentioned ten things, lean
   toward ten or more suggestions. There is no small cap; aim to cover
   everything they brought up. Every suggestion must be grounded in something
   they actually said (never invent). Each suggestion is an object:
   - title: action-oriented phrase, 2–6 words (e.g. "Start a Catan round", "Casual photo walk", "Cook a new dish together")
   - description: one short sentence about what would happen
   - day: a realistic day of the week ("Thursday", "Saturday", etc.)
   - time: realistic 24-hour time ("19:30", "14:00", etc.)
   - duration: in plain words ("1.5 hours", "2 hours")
   - location_area: a Rotterdam-context area ("Near EUR campus", "Kralingen", "Centrum", "Delfshaven", "Noord", "Hillegersberg")
   - exact_venue: a specific plausible venue inside that area (a café, park, square, studio, etc.). Keep it short.
   - group_size_target: integer 3–6
   - language: "English", "Dutch", or "German"
   - energy_level: one of "Low-pressure / structured", "Relaxed", "Creative", "Active", "Lively small group"
   - specific_interest_tags: 1–3 lowercase tags directly matching one topic
   - broader_interest_tags: 1–3 lowercase tags that are related/broader
   - reason: one sentence explaining why this fits, citing their words

   Each suggestion should map to a different topic where possible (so the user
   gets variety, not three near-duplicates).

Rules:
- Use the speaker's own words and concepts wherever possible.
- Never invent interests, hobbies, or facts the speaker did not mention.
- Activity suggestions must be grounded — only suggest cooking if they
  mentioned food/cooking; only suggest running if they mentioned movement; etc.
- Avoid stigmatizing or therapeutic language. Never use: "lonely",
  "loneliness", "find your tribe", "mental health", "therapy", "intervention",
  "best friends", "dating", "networking".
- Keep tone calm, neutral, respectful.
- Return ONLY a JSON object, no prose, no markdown fences.`;

interface Topic {
  title: string;
  explanation: string;
  tags: string[];
}

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

interface Analysis {
  topics: Topic[];
  minor_interests: string[];
  languages: string[];
  activity_types: string[];
  availability: string[];
  commitment: string;
  activities: SuggestedActivity[];
}

const AVAILABILITY_TOKENS = new Set([
  "every-weekend",
  "weekday-evenings",
  "thursday-evening",
  "friday-morning",
  "flexible",
]);
const COMMITMENT_TOKENS = new Set([
  "try-once",
  "maybe-weekly",
  "regular-thing",
  "open-ended",
]);

function tokenList(v: unknown, allowed: Set<string>, max: number): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  for (const x of v as unknown[]) {
    const tok = String(x).toLowerCase().trim();
    if (allowed.has(tok)) seen.add(tok);
  }
  return Array.from(seen).slice(0, max);
}

function oneToken(v: unknown, allowed: Set<string>): string {
  const tok = String(v ?? "").toLowerCase().trim();
  return allowed.has(tok) ? tok : "";
}

function strList(v: unknown, max: number): string[] {
  return Array.isArray(v)
    ? (v as unknown[])
        .map((x) => String(x).trim())
        .filter((x) => x.length > 0)
        .slice(0, max)
    : [];
}

function lowerList(v: unknown, max: number): string[] {
  return Array.isArray(v)
    ? (v as unknown[])
        .map((x) => String(x).toLowerCase().trim())
        .filter((x) => x.length > 0)
        .slice(0, max)
    : [];
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function coerce(raw: unknown): Analysis {
  const r = (raw ?? {}) as Record<string, unknown>;
  const topics = Array.isArray(r.topics)
    ? (r.topics as Record<string, unknown>[])
        .filter((t) => typeof t?.title === "string")
        .map((t) => ({
          title: String(t.title).slice(0, 60),
          explanation:
            typeof t.explanation === "string"
              ? t.explanation.slice(0, 240)
              : "",
          tags: lowerList(t.tags, 5),
        }))
        .slice(0, 24)
    : [];
  const minor = strList(r.minor_interests, 12);
  const langs = strList(r.languages, 6);
  const types = strList(r.activity_types, 4);
  const availability = tokenList(r.availability, AVAILABILITY_TOKENS, 5);
  const commitment = oneToken(r.commitment, COMMITMENT_TOKENS);
  const activities = Array.isArray(r.activities)
    ? (r.activities as Record<string, unknown>[])
        .filter((a) => typeof a?.title === "string")
        .map((a) => ({
          title: String(a.title).slice(0, 70),
          description:
            typeof a.description === "string"
              ? a.description.slice(0, 200)
              : "",
          day:
            typeof a.day === "string" && a.day.trim() ? a.day.trim() : "Thursday",
          time:
            typeof a.time === "string" && a.time.trim() ? a.time.trim() : "19:30",
          duration:
            typeof a.duration === "string" && a.duration.trim()
              ? a.duration.trim()
              : "1.5 hours",
          location_area:
            typeof a.location_area === "string" && a.location_area.trim()
              ? a.location_area.trim()
              : "Near EUR campus",
          exact_venue:
            typeof a.exact_venue === "string" && a.exact_venue.trim()
              ? a.exact_venue.trim()
              : "Venue confirmed in chat",
          group_size_target: clampInt(a.group_size_target, 3, 6, 4),
          language:
            typeof a.language === "string" && a.language.trim()
              ? a.language.trim()
              : "English",
          energy_level:
            typeof a.energy_level === "string" && a.energy_level.trim()
              ? a.energy_level.trim()
              : "Low-pressure / structured",
          specific_interest_tags: lowerList(a.specific_interest_tags, 3),
          broader_interest_tags: lowerList(a.broader_interest_tags, 3),
          reason:
            typeof a.reason === "string" ? a.reason.slice(0, 200) : "",
        }))
        .slice(0, 24)
    : [];
  return {
    topics,
    minor_interests: minor,
    languages: langs,
    activity_types: types,
    availability,
    commitment,
    activities,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OLLAMA_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://ollama.com/v1";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OLLAMA_API_KEY on the server" },
      { status: 500 },
    );
  }

  let body: { transcript?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim() : "";

  if (!transcript) {
    return NextResponse.json({ error: "Empty transcript" }, { status: 400 });
  }

  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-oss:120b",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    return NextResponse.json(
      { error: `Ollama ${r.status}`, detail },
      { status: r.status },
    );
  }

  let payload: unknown;
  try {
    payload = await r.json();
  } catch {
    return NextResponse.json(
      { error: "Ollama returned non-JSON" },
      { status: 502 },
    );
  }
  const content =
    (payload as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
      ?.message?.content ?? "";
  if (!content) {
    return NextResponse.json(
      { error: "Empty model response", raw: payload },
      { status: 502 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Some models wrap JSON in ```json fences; try to recover.
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return NextResponse.json(
          { error: "Could not parse model JSON", raw: content },
          { status: 502 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Could not parse model JSON", raw: content },
        { status: 502 },
      );
    }
  }

  const analysis = coerce(parsed);
  return NextResponse.json(analysis);
}
