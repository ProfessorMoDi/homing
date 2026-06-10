// Client-side voice processing orchestrator. Runs in the background while the
// user answers profile questions — transcribe → understand → suggest → people.

export type PipelineStage =
  | "idle"
  | "transcribing"
  | "understanding"
  | "planning"
  | "syncing"
  | "people"
  | "ready"
  | "error";

export interface SimilarPerson {
  user_id: string;
  first_name: string;
  neighbourhood: string;
  score: number;
  reasons: string[];
}

export interface PipelineTopic {
  title: string;
  explanation: string;
  tags: string[];
  quote?: string;
}

export interface PipelineSuggestedActivity {
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
  reason: string;
}

export interface UnderstandResult {
  topics: PipelineTopic[];
  minor_interests: string[];
  languages: string[];
  language_confidence?: string;
  activity_types: string[];
  availability?: string[];
  commitment?: string;
  implicit_preferences?: Array<{ phrase: string; evidence_quote?: string }>;
  companion_reflection?: string;
  matching_notes?: string;
  missing_fields?: string[];
  detected_language?: string | null;
}

export interface PipelineHandlers {
  onStage: (stage: PipelineStage) => void;
  onTranscriptSeed: (transcript: string) => void;
  onDetectedLanguage: (language: string | null) => void;
  onUnderstand: (transcript: string, data: UnderstandResult) => void;
  onActivities: (activities: PipelineSuggestedActivity[]) => void;
  onSimilarPeople: (people: SimilarPerson[]) => void;
  onError: (message: string) => void;
}

export interface PipelineOptions {
  /** Collect build skips activity suggestions. */
  skipActivities?: boolean;
  selfId?: string;
  signal?: AbortSignal;
  /** Awaited before match-live so LIKES / User land in Neo4j first. */
  beforePeopleMatch?: () => Promise<void>;
}

export async function runVoicePipeline(
  blob: Blob,
  handlers: PipelineHandlers,
  opts: PipelineOptions = {},
): Promise<void> {
  const { skipActivities = false, selfId, signal, beforePeopleMatch } = opts;

  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };

  try {
    handlers.onStage("transcribing");
    checkAbort();

    const form = new FormData();
    form.append("audio", blob, "recording.webm");
    const tr = await fetch("/api/transcribe", { method: "POST", body: form });
    if (!tr.ok) throw new Error(`Transcription failed (${tr.status})`);
    const tdata = (await tr.json()) as { text?: string; language?: string | null };
    const transcript = (tdata.text || "").trim();
    if (!transcript) throw new Error("We couldn't make out any speech. Try recording again.");

    const detectedLang =
      typeof tdata.language === "string" && tdata.language.trim()
        ? tdata.language.trim()
        : null;

    handlers.onDetectedLanguage(detectedLang);
    handlers.onTranscriptSeed(transcript);

    handlers.onStage("understanding");
    checkAbort();

    const ar = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        detected_language: detectedLang,
        phase: "understand",
      }),
    });
    if (!ar.ok) {
      const detail = await ar.text().catch(() => "");
      throw new Error(`Analysis failed (${ar.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`);
    }
    const analysis = (await ar.json()) as UnderstandResult & { error?: string };
    if (analysis.error) throw new Error(analysis.error);
    if (!analysis.topics?.length) {
      throw new Error("Homi couldn't pick up clear interests. Try recording again with more detail.");
    }

    handlers.onUnderstand(transcript, {
      ...analysis,
      detected_language: detectedLang,
    });

    let activities: PipelineSuggestedActivity[] = [];

    if (!skipActivities) {
      handlers.onStage("planning");
      checkAbort();

      const sr = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          topics: analysis.topics,
          languages: analysis.languages,
          availability_hints: analysis.availability,
          minor_interests: analysis.minor_interests,
        }),
      });
      if (sr.ok) {
        const sd = (await sr.json()) as { activities?: PipelineSuggestedActivity[] };
        activities = sd.activities ?? [];
      }
      if (activities.length > 0) {
        handlers.onActivities(activities);
      }
    }

    handlers.onStage("syncing");
    checkAbort();

    if (beforePeopleMatch) {
      await beforePeopleMatch();
    } else {
      await new Promise((r) => setTimeout(r, 800));
    }
    checkAbort();

    handlers.onStage("people");
    const topicTags = analysis.topics.flatMap((t) => [
      t.title,
      ...t.tags,
    ]);

    let people: SimilarPerson[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 500));
        checkAbort();
      }
      try {
        const mr = await fetch("/api/neo4j/match-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topics: topicTags, selfId }),
        });
        if (mr.ok) {
          const md = (await mr.json()) as {
            candidates?: SimilarPerson[];
          };
          people = (md.candidates ?? []).slice(0, 5);
          break;
        }
      } catch {
        // retry
      }
    }
    handlers.onSimilarPeople(people);

    handlers.onStage("ready");
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    const msg =
      e instanceof Error ? e.message : "Something went wrong processing your voice.";
    handlers.onError(msg);
    handlers.onStage("error");
  }
}

export function pipelineStageLabel(stage: PipelineStage): string {
  switch (stage) {
    case "idle":
      return "Waiting to start…";
    case "transcribing":
      return "Transcribing your recording…";
    case "understanding":
      return "Pulling out your interests…";
    case "planning":
      return "Drafting activities that fit…";
    case "syncing":
      return "Saving your profile…";
    case "people":
      return "Finding people with similar interests…";
    case "ready":
      return "Homi is ready — your interests are in.";
    case "error":
      return "Something went wrong";
    default:
      return "";
  }
}
