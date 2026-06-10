import { NextRequest, NextResponse } from "next/server";
import { llmModelSuggest } from "@/lib/llmConfig";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You generate concrete activity suggestions for a young adult who is a student at Erasmus University Rotterdam (EUR). The output is for HOMING, an app that turns interests into small, low-pressure real-life activities. Output strict JSON.

You'll receive a list of topics the user cares about (each with a title, explanation, and tags), plus their comfortable languages and availability hints.

Output an object: { activities: [...] }. Generate one or more grounded suggestions for AS MANY of their topics as you can — MORE IS BETTER. If they care about ten things, lean toward ten or more suggestions so they feel fully understood. Never invent a topic they didn't give. Each activity is:
- title: action-oriented, 2–6 words (e.g. "Start a Catan round", "Slow Saturday photo walk", "Cook a new dish together")
- description: one short sentence about what would happen
- day: realistic day of week (e.g. "Thursday", "Saturday")
- time: realistic 24-hour time (e.g. "19:30", "14:00")
- duration: in plain words (e.g. "1.5 hours", "2 hours")
- location_area: a Rotterdam-context area ("Near EUR campus", "Kralingen", "Centrum", "Delfshaven", "Noord", "Hillegersberg")
- exact_venue: a specific plausible spot inside that area (a café, park, square, studio, etc.). Keep it short.
- group_size_target: integer 3–6
- language: their stated comfortable language, or "Flexible" if unknown — never default to English unless they said English
- energy_level: one of "Low-pressure / structured", "Relaxed", "Creative", "Active", "Lively small group"
- specific_interest_tags: 1–3 lowercase tags that directly match one topic
- broader_interest_tags: 1–3 lowercase tags that are broader/related
- reason: one sentence explaining why this fits, referencing their interest

Rules:
- Each suggestion should map to a DIFFERENT topic where possible (variety).
- Stay grounded — only suggest cooking if there's a cooking-related topic, only suggest running if there's a movement topic, etc.
- Use the speaker's own words and concepts where possible. Never invent interests they didn't have a topic for.
- Avoid stigmatizing or therapeutic language. Never use: "lonely", "loneliness", "find your tribe", "mental health", "therapy", "intervention", "best friends", "dating", "networking".
- Calm, neutral, respectful tone.
- Return ONLY a JSON object, no prose, no markdown fences.`;

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

function coerceActivities(raw: unknown): SuggestedActivity[] {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(r.activities)) return [];
  return (r.activities as Record<string, unknown>[])
    .filter((a) => typeof a?.title === "string")
    .map((a) => ({
      title: String(a.title).slice(0, 70),
      description:
        typeof a.description === "string"
          ? a.description.slice(0, 200)
          : "",
      day:
        typeof a.day === "string" && a.day.trim() ? a.day.trim() : "",
      time:
        typeof a.time === "string" && a.time.trim() ? a.time.trim() : "",
      duration:
        typeof a.duration === "string" && a.duration.trim()
          ? a.duration.trim()
          : "1.5 hours",
      location_area:
        typeof a.location_area === "string" && a.location_area.trim()
          ? a.location_area.trim()
          : "",
      exact_venue:
        typeof a.exact_venue === "string" && a.exact_venue.trim()
          ? a.exact_venue.trim()
          : "",
      group_size_target: clampInt(a.group_size_target, 3, 6, 4),
      language:
        typeof a.language === "string" && a.language.trim()
          ? a.language.trim()
          : "Flexible",
      energy_level:
        typeof a.energy_level === "string" && a.energy_level.trim()
          ? a.energy_level.trim()
          : "Low-pressure / structured",
      specific_interest_tags: lowerList(a.specific_interest_tags, 3),
      broader_interest_tags: lowerList(a.broader_interest_tags, 3),
      reason: typeof a.reason === "string" ? a.reason.slice(0, 200) : "",
    }))
    .slice(0, 40);
}

interface TopicIn {
  title: string;
  explanation: string;
  tags: string[];
}

function buildUserMessage(body: {
  topics: TopicIn[];
  transcript?: string;
  languages?: string[];
  availability_hints?: string[];
  minor_interests?: string[];
}): string {
  const lines: string[] = [];
  if (body.transcript?.trim()) {
    lines.push("Original voice transcript:");
    lines.push(body.transcript.trim());
    lines.push("");
  }
  lines.push("Topics the user cares about:");
  body.topics.forEach((t, i) => {
    lines.push(
      `${i + 1}. ${t.title} — ${t.explanation} [tags: ${(t.tags ?? []).join(", ")}]`,
    );
  });
  if (body.minor_interests && body.minor_interests.length > 0) {
    lines.push("");
    lines.push(`Smaller details: ${body.minor_interests.join("; ")}`);
  }
  if (body.languages && body.languages.length > 0) {
    lines.push("");
    lines.push(`Comfortable languages: ${body.languages.join(", ")}`);
  }
  if (body.availability_hints && body.availability_hints.length > 0) {
    lines.push("");
    lines.push(`Availability: ${body.availability_hints.join("; ")}`);
  }
  lines.push("");
  lines.push(
    "Now generate a grounded activity suggestion for as many of these topics as you can — more is better, cover everything they mentioned.",
  );
  return lines.join("\n");
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

  let body: {
    topics?: unknown;
    transcript?: unknown;
    languages?: unknown;
    availability_hints?: unknown;
    minor_interests?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const topics = Array.isArray(body.topics)
    ? (body.topics as Record<string, unknown>[])
        .filter((t) => typeof t?.title === "string")
        .map((t) => ({
          title: String(t.title),
          explanation:
            typeof t.explanation === "string" ? t.explanation : "",
          tags: lowerList(t.tags, 5),
        }))
        .slice(0, 40)
    : [];

  if (topics.length === 0) {
    return NextResponse.json(
      { error: "No topics provided" },
      { status: 400 },
    );
  }

  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim() : undefined;

  const userMessage = buildUserMessage({
    topics,
    transcript,
    languages: Array.isArray(body.languages)
      ? (body.languages as unknown[]).map((x) => String(x)).slice(0, 6)
      : undefined,
    availability_hints: Array.isArray(body.availability_hints)
      ? (body.availability_hints as unknown[]).map((x) => String(x)).slice(0, 6)
      : undefined,
    minor_interests: Array.isArray(body.minor_interests)
      ? (body.minor_interests as unknown[]).map((x) => String(x)).slice(0, 6)
      : undefined,
  });

  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: llmModelSuggest(),
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
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

  const activities = coerceActivities(parsed);
  return NextResponse.json({ activities });
}
