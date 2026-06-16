import { NextRequest, NextResponse } from "next/server";
import { cleanupTranscript } from "@/lib/transcriptCleanup";
import { llmModelUnderstand } from "@/lib/llmConfig";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_TOPICS = 40;
const MAX_ACTIVITIES = 40;

const UNDERSTAND_PROMPT = `You analyze a voice transcript from HOMING, an app that turns a young adult's interests into small, low-pressure real-life activities in Rotterdam, Netherlands. The user is a student at Erasmus University Rotterdam (EUR).

Return a strict JSON object with exactly these fields.

1) topics — EVERY distinct interest the speaker actually mentioned. Do NOT cap artificially — if they mention many things, return many (15–20+ is fine; reward breadth). Each item:
   - title: 1–4 word phrase (Title Case)
   - explanation: one short sentence paraphrasing what they said
   - tags: 2–5 lowercase keyword tags
   - quote: a short verbatim phrase from the transcript that proves they said it
   - broader: 1–2 lowercase broader categories this interest belongs to (e.g. "korean cooking" → ["cooking", "food"]). General knowledge is fine here — this does NOT need transcript evidence.
   - related: up to 2 lowercase sibling interests someone into this is typically also into (e.g. "salsa" → ["bachata"]). General knowledge is fine here too.

   CRITICAL: One topic = one atomic concept. Never bundle separable interests.
   "Cooking" and "Asian food" are TWO topics. "Salsa" and "bachata" are TWO topics.
   DEDUP: Prefer distinct interests — do NOT emit many near-duplicates (e.g. five variants of "running"). Merge synonyms into one topic with richer tags.

   LANGUAGE NEGATION: If they say a language is rough, not comfortable, or "English only", do NOT list that language in languages[]. "My Dutch is still rough" means Dutch is NOT comfortable — exclude it. Only include languages they positively claim.

2) minor_interests — up to 20 short phrases for smaller details, preferences, constraints, spots, vibe, times. Only things they actually said.

3) languages — array of objects for languages they EXPLICITLY said they speak or are comfortable using:
   - name: Title Case language name
   - evidence_quote: verbatim phrase from transcript
   Only include when clearly stated ("I speak…", "comfortable in…", "X is fine", "we could do it in German").
   NEVER infer from nationality, city, university, or detected_language alone. If none stated, return [].

4) language_confidence — "high" if at least one language has clear evidence_quote; "partial" if vague; "none" if no languages stated.

5) activity_types — 2–6 style descriptors from what they said (e.g. "low-pressure first meeting", "outdoors").

6) availability — tokens ONLY from: "every-weekend", "weekday-evenings", "thursday-evening", "friday-morning", "flexible".
   - NEVER propose a SPECIFIC day/time slot ("thursday-evening", "friday-morning") unless they name that exact day directly (e.g. "Thursdays work", "Friday mornings"). Do not infer a specific day from vague hints like "some evenings" or "when I'm free".
   - For vague or general availability, use only a general token ("weekday-evenings", "every-weekend") or "flexible".
   - If they don't clearly state when they're free, return [] — do not guess. Never invent a specific day.

7) commitment — one token from: "try-once", "maybe-weekly", "regular-thing", "open-ended", or "" if unclear.

8) implicit_preferences — up to 12 practical between-the-lines signals (pace, group size, structure, "not looking for X"). Each object:
   - phrase: short label
   - evidence_quote: verbatim proof from transcript
   Never mental-health or loneliness inference.

9) companion_reflection — 2–4 warm, neutral sentences mirroring back what they want. If they named many interests, acknowledge the breadth. No therapy language.

10) matching_notes — one paragraph: what to optimize matching on given their full interest set.

Rules:
- Never invent interests, languages, or facts not in the transcript.
- Avoid: lonely, loneliness, find your tribe, mental health, therapy, intervention, best friends, dating, networking.
- Return ONLY JSON, no markdown fences.`;

const PLAN_PROMPT = `You generate concrete activity suggestions for HOMING in Rotterdam for an EUR student.

You receive their full transcript plus structured understanding (topics, preferences, languages).

Return JSON: { activities: [...] }

Generate at least ONE grounded activity per topic where a real Rotterdam meetup is plausible. MORE IS BETTER — if they named ten interests, aim for ten or more activities.

Each activity:
- title: action-oriented, 2–6 words
- description: one short sentence
- day, time: ONLY if the speaker mentioned a day or timing preference; otherwise leave them as "" (open — the user picks when). Never invent a specific day/time they didn't state. duration: a realistic estimate is fine.
- location_area: Rotterdam area
- exact_venue: plausible specific venue
- group_size_target: integer 3–6
- language: use their stated comfortable language, or "Flexible" if unknown — NEVER default to English unless they said English
- energy_level: one of "Low-pressure / structured", "Relaxed", "Creative", "Active", "Lively small group"
- specific_interest_tags, broader_interest_tags: lowercase tags
- linked_topic_title: must match one topic title exactly
- transcript_quote: short verbatim phrase from transcript
- reason: one sentence citing their words
- scheduling_inferred: true if day/time were not stated and you chose defaults

Rules:
- Every activity must map to a topic they actually mentioned.
- Never invent interests.
- Avoid stigmatizing language.
- Return ONLY JSON.`;

interface TopicRow {
  title: string;
  explanation: string;
  tags: string[];
  quote?: string;
  broader: string[];
  related: string[];
}

interface LanguageRow {
  name: string;
  evidence_quote?: string;
}

interface ImplicitPref {
  phrase: string;
  evidence_quote?: string;
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
  linked_topic_title?: string;
  transcript_quote?: string;
  reason: string;
  scheduling_inferred?: boolean;
  priority_rank?: number;
}

interface UnderstandResult {
  topics: TopicRow[];
  minor_interests: string[];
  languages: LanguageRow[];
  language_confidence: string;
  activity_types: string[];
  availability: string[];
  commitment: string;
  implicit_preferences: ImplicitPref[];
  companion_reflection: string;
  matching_notes: string;
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
const MISSING_FIELD_TOKENS = new Set([
  "availability",
  "commitment",
  "gender",
  "postcode",
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

function coerceUnderstand(raw: unknown): UnderstandResult {
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
          quote:
            typeof t.quote === "string" ? t.quote.slice(0, 200) : undefined,
          broader: lowerList(t.broader, 2),
          related: lowerList(t.related, 2),
        }))
        .slice(0, MAX_TOPICS)
    : [];

  const languages = Array.isArray(r.languages)
    ? (r.languages as Record<string, unknown>[])
        .filter((l) => typeof l?.name === "string")
        .map((l) => ({
          name: String(l.name).slice(0, 40),
          evidence_quote:
            typeof l.evidence_quote === "string"
              ? l.evidence_quote.slice(0, 200)
              : undefined,
        }))
        .slice(0, 10)
    : [];

  const implicit_preferences = Array.isArray(r.implicit_preferences)
    ? (r.implicit_preferences as Record<string, unknown>[])
        .filter((p) => typeof p?.phrase === "string")
        .map((p) => ({
          phrase: String(p.phrase).slice(0, 120),
          evidence_quote:
            typeof p.evidence_quote === "string"
              ? p.evidence_quote.slice(0, 200)
              : undefined,
        }))
        .slice(0, 12)
    : [];

  const conf = String(r.language_confidence ?? "none").toLowerCase();
  const language_confidence =
    conf === "high" || conf === "partial" ? conf : "none";

  return {
    topics,
    minor_interests: strList(r.minor_interests, 20),
    languages,
    language_confidence,
    activity_types: strList(r.activity_types, 6),
    availability: tokenList(r.availability, AVAILABILITY_TOKENS, 5),
    commitment: oneToken(r.commitment, COMMITMENT_TOKENS),
    implicit_preferences,
    companion_reflection:
      typeof r.companion_reflection === "string"
        ? r.companion_reflection.slice(0, 600)
        : "",
    matching_notes:
      typeof r.matching_notes === "string"
        ? r.matching_notes.slice(0, 500)
        : "",
  };
}

function coerceActivities(raw: unknown): SuggestedActivity[] {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(r.activities)) return [];
  return (r.activities as Record<string, unknown>[])
    .filter((a) => typeof a?.title === "string")
    .map((a, i) => ({
      title: String(a.title).slice(0, 70),
      description:
        typeof a.description === "string" ? a.description.slice(0, 200) : "",
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
      linked_topic_title:
        typeof a.linked_topic_title === "string"
          ? a.linked_topic_title.slice(0, 60)
          : undefined,
      transcript_quote:
        typeof a.transcript_quote === "string"
          ? a.transcript_quote.slice(0, 200)
          : undefined,
      reason:
        typeof a.reason === "string" ? a.reason.slice(0, 200) : "",
      scheduling_inferred: a.scheduling_inferred === true,
      priority_rank: i + 1,
    }))
    .slice(0, MAX_ACTIVITIES);
}

function languageNames(rows: LanguageRow[]): string[] {
  return rows.map((l) => l.name).filter(Boolean);
}

function computeMissingFields(u: UnderstandResult): string[] {
  const missing: string[] = [];
  if (u.availability.length === 0) missing.push("availability");
  if (!u.commitment) missing.push("commitment");
  // gender and postcode are never inferred from voice
  missing.push("gender", "postcode");
  return missing.filter((m) => MISSING_FIELD_TOKENS.has(m));
}

async function callLlm(
  apiKey: string,
  baseUrl: string,
  system: string,
  user: string,
  temperature: number,
): Promise<unknown> {
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: llmModelUnderstand(),
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Ollama ${r.status}: ${detail}`);
  }

  const payload = (await r.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty model response");

  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse model JSON");
  }
}

export async function POST(req: NextRequest) {
  const apiKeyRaw = process.env.OLLAMA_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://ollama.com/v1";
  if (!apiKeyRaw) {
    return NextResponse.json(
      { error: "Missing OLLAMA_API_KEY on the server" },
      { status: 500 },
    );
  }
  const apiKey = apiKeyRaw;

  let body: {
    transcript?: unknown;
    detected_language?: unknown;
    phase?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const phase = body.phase === "full" ? "full" : "understand";

  const rawTranscript =
    typeof body.transcript === "string" ? body.transcript.trim() : "";
  const detected_language =
    typeof body.detected_language === "string" && body.detected_language.trim()
      ? body.detected_language.trim()
      : null;

  if (!rawTranscript) {
    return NextResponse.json({ error: "Empty transcript" }, { status: 400 });
  }

  const transcript = cleanupTranscript(rawTranscript);

  let understood: UnderstandResult;
  try {
    const hint = detected_language
      ? `\n\nSTT detected_language hint (do NOT use as sole evidence for languages): ${detected_language}`
      : "";
    const parsed = await callLlm(
      apiKey,
      baseUrl,
      UNDERSTAND_PROMPT,
      transcript + hint,
      0.25,
    );
    understood = coerceUnderstand(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Understand pass failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  async function runPlanPass(): Promise<SuggestedActivity[]> {
    const planUser = JSON.stringify(
      {
        transcript,
        understanding: {
          topics: understood.topics,
          minor_interests: understood.minor_interests,
          languages: understood.languages,
          activity_types: understood.activity_types,
          availability: understood.availability,
          commitment: understood.commitment,
          implicit_preferences: understood.implicit_preferences,
        },
      },
      null,
      2,
    );
    const planParsed = await callLlm(
      apiKey,
      baseUrl,
      PLAN_PROMPT,
      planUser,
      0.35,
    );
    return coerceActivities(planParsed);
  }

  const langNames = languageNames(understood.languages);
  const missing_fields = computeMissingFields(understood);

  const understandPayload = {
    topics: understood.topics,
    minor_interests: understood.minor_interests,
    languages: langNames,
    language_confidence: understood.language_confidence,
    activity_types: understood.activity_types,
    availability: understood.availability,
    commitment: understood.commitment,
    implicit_preferences: understood.implicit_preferences,
    companion_reflection: understood.companion_reflection,
    matching_notes: understood.matching_notes,
    missing_fields,
    detected_language,
  };

  if (phase === "understand") {
    return NextResponse.json(understandPayload);
  }

  let activities: SuggestedActivity[] = [];
  try {
    activities = await runPlanPass();
    if (activities.length === 0 && understood.topics.length > 0) {
      activities = await runPlanPass();
    }
  } catch (e) {
    console.warn("Plan pass failed", e);
    if (understood.topics.length > 0) {
      try {
        activities = await runPlanPass();
      } catch (retryErr) {
        console.warn("Plan pass retry failed", retryErr);
      }
    }
  }

  return NextResponse.json({
    ...understandPayload,
    activities,
  });
}
