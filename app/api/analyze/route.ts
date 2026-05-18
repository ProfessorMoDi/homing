import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEMO_PADDING = `
Anyway, my Thursday evenings are usually free. I'm in Kralingen so anywhere
near campus is easier. I'd rather keep it small, like four people, not a big
event. English is fine, German also works for me. I'd want to start with
something low-pressure — one round, see how it feels, and maybe make it a
regular thing if it clicks. Honestly I'm just looking to actually do the
stuff I already enjoy with other people, not plan it forever.
`.trim();

const SYSTEM_PROMPT = `You analyze a voice transcript from HOMING, an app that turns a young adult's interests into a small, low-pressure real-life activity in Rotterdam, Netherlands. The user is a student at Erasmus University Rotterdam (EUR).

Return a strict JSON object with exactly these fields.

1) topics — array of 3–8 main themes the speaker mentioned. Each item is an object:
   - title: 1–4 word phrase (Title Case)
   - explanation: one short sentence paraphrasing what they said about it
   - tags: 2–5 lowercase keyword tags

   CRITICAL: One topic = one distinct, atomic concept. Do NOT bundle separable
   interests under a single topic. Each should stand on its own so it can be
   independently kept, edited, or removed.
   - "Cooking" and "Asian food" are TWO topics. Cooking is a craft; Asian
     food is a cuisine. Someone who cooks may cook many cuisines.
   - "Running" and "morning routines" are TWO topics.
   - "Photography" and "wandering Rotterdam" are TWO topics.
   - "Board games" and "Catan" are TWO topics ("Catan" is more specific).
   - "Music" and "techno" are TWO topics; "Music production" is yet another.
   - Each topic's tags should only describe THAT topic — never mix tags from
     other concepts.

2) minor_interests — up to 5 short phrases capturing smaller details.

3) languages — language names in Title Case the speaker is comfortable using.

4) activity_types — 2–4 short style descriptors (e.g. "sit-down", "creative", "low-pressure first meeting", "outdoors", "structured", "games", "language exchange").

5) activities — 3 concrete activity suggestions grounded in what they actually said. Each suggestion is an object:
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

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

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
  activities: SuggestedActivity[];
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
        .slice(0, 8)
    : [];
  const minor = strList(r.minor_interests, 5);
  const langs = strList(r.languages, 6);
  const types = strList(r.activity_types, 4);
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
        .slice(0, 4)
    : [];
  return {
    topics,
    minor_interests: minor,
    languages: langs,
    activity_types: types,
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

  let body: { transcript?: unknown; demoMode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim() : "";
  const demoMode = body.demoMode === true;

  if (!transcript) {
    return NextResponse.json({ error: "Empty transcript" }, { status: 400 });
  }

  const padded =
    demoMode && wordCount(transcript) < 40
      ? `${transcript}\n\n${DEMO_PADDING}`
      : transcript;

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
        { role: "user", content: padded },
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
  return NextResponse.json({
    ...analysis,
    padded_for_demo: demoMode && wordCount(transcript) < 40,
  });
}
