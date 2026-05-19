"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Mic,
  Brain,
  Network,
  Sparkles,
  Lock,
  Cloud,
  Cpu,
  Database,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Home,
} from "lucide-react";
import { Card, Pill } from "@/components/Bits";
import { Pigeon, PigeonMark } from "@/components/Pigeon";
import {
  FlowStep,
  StackTile,
  CodeSnippet,
  ResidencyRow,
  MatchGraph,
  AudioWave,
} from "@/components/Diagrams";

interface SectionDef {
  id: string;
  label: string;
}

const SECTIONS: SectionDef[] = [
  { id: "hero", label: "Intro" },
  { id: "stack", label: "Stack" },
  { id: "audio", label: "Voice" },
  { id: "nlp", label: "NLP" },
  { id: "graph", label: "Graph" },
  { id: "privacy", label: "Privacy" },
];

export default function Theory() {
  const [active, setActive] = useState(0);

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(SECTIONS.length - 1, idx));
    document
      .getElementById(SECTIONS[clamped].id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Track which section is in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (
            e.isIntersecting &&
            (!best || e.intersectionRatio > best.intersectionRatio)
          ) {
            best = e;
          }
        }
        if (best) {
          const idx = SECTIONS.findIndex((s) => s.id === best!.target.id);
          if (idx >= 0) setActive(idx);
        }
      },
      { threshold: [0.25, 0.5, 0.75] },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Keyboard nav: ← → PgUp PgDn Space Home End.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === "PageDown" ||
        e.key === " " ||
        e.key === "j"
      ) {
        e.preventDefault();
        setActive((a) => {
          const next = Math.min(SECTIONS.length - 1, a + 1);
          document
            .getElementById(SECTIONS[next].id)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
          return next;
        });
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowUp" ||
        e.key === "PageUp" ||
        e.key === "k"
      ) {
        e.preventDefault();
        setActive((a) => {
          const prev = Math.max(0, a - 1);
          document
            .getElementById(SECTIONS[prev].id)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
          return prev;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        document
          .getElementById(SECTIONS[0].id)
          ?.scrollIntoView({ behavior: "smooth" });
      } else if (e.key === "End") {
        e.preventDefault();
        document
          .getElementById(SECTIONS[SECTIONS.length - 1].id)
          ?.scrollIntoView({ behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--color-cream)]">
      <PresentationHeader active={active} goTo={goTo} />

      <main>
        <HeroSlide goTo={goTo} />
        <StackSlide />
        <AudioSlide />
        <NlpSlide />
        <GraphSlide />
        <PrivacySlide />
      </main>

      <FloatingNav active={active} goTo={goTo} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chrome — sticky header + floating prev/next                       */
/* ------------------------------------------------------------------ */

function PresentationHeader({
  active,
  goTo,
}: {
  active: number;
  goTo: (idx: number) => void;
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--color-cream)]/85 border-b border-[var(--color-line)]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-10 h-14 md:h-16 flex items-center gap-3 md:gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0"
          aria-label="Back to landing"
        >
          <PigeonMark size={22} />
          <span className="display text-[16px] md:text-[18px]">HOMING</span>
        </Link>
        <span className="hidden md:inline text-[12px] text-[var(--color-muted)] uppercase tracking-[0.18em]">
          Under the hood
        </span>

        <nav
          className="ml-auto hidden md:flex items-center gap-1"
          aria-label="Section navigation"
        >
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === active ? "true" : undefined}
              className={
                "px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-colors " +
                (i === active
                  ? "bg-[var(--color-sage)] text-white"
                  : "text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-warm)]")
              }
            >
              <span className="font-mono text-[10.5px] opacity-70 mr-1">
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Mobile: dot indicator only */}
        <nav
          className="ml-auto flex md:hidden items-center gap-1.5"
          aria-label="Section navigation"
        >
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to ${s.label}`}
              aria-current={i === active ? "true" : undefined}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === active
                  ? "w-6 bg-[var(--color-ink)]"
                  : "w-1.5 bg-[var(--color-line)]")
              }
            />
          ))}
        </nav>

        <span className="hidden md:inline tabular-nums text-[12.5px] text-[var(--color-muted)] ml-2">
          {String(active + 1).padStart(2, "0")} / {SECTIONS.length}
        </span>
      </div>
    </header>
  );
}

function FloatingNav({
  active,
  goTo,
}: {
  active: number;
  goTo: (idx: number) => void;
}) {
  const atStart = active === 0;
  const atEnd = active === SECTIONS.length - 1;
  return (
    <div className="fixed bottom-5 right-5 md:bottom-7 md:right-8 z-30 flex items-center gap-2">
      <button
        type="button"
        onClick={() => goTo(active - 1)}
        disabled={atStart}
        aria-label="Previous section"
        className="grid place-items-center h-11 w-11 md:h-12 md:w-12 rounded-full bg-white border border-[var(--color-line)] shadow-[0_4px_16px_rgba(31,38,28,0.10)] text-[var(--color-ink)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-cream-warm)] transition-colors"
      >
        <ArrowLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => goTo(active + 1)}
        disabled={atEnd}
        aria-label="Next section"
        className="grid place-items-center h-11 w-11 md:h-12 md:w-12 rounded-full bg-[var(--color-sage)] text-white shadow-[0_6px_18px_rgba(79,121,66,0.32)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-sage-deep)] transition-colors"
      >
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section frame                                                      */
/* ------------------------------------------------------------------ */

interface SlideProps {
  id: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

function Slide({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: SlideProps) {
  return (
    <section
      id={id}
      className={
        "min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)] scroll-mt-14 md:scroll-mt-16 " +
        "px-5 md:px-10 lg:px-12 py-10 md:py-16 lg:py-20 " +
        "max-w-6xl mx-auto flex flex-col " +
        className
      }
    >
      {(eyebrow || title || subtitle) && (
        <header className="mb-8 md:mb-12">
          {eyebrow && (
            <p className="text-[11px] md:text-[13px] uppercase tracking-[0.2em] text-[var(--color-sage-deep)] font-medium mb-2 md:mb-3">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="display text-[28px] md:text-[44px] lg:text-[54px] leading-[1.05]">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-[14px] md:text-[17px] lg:text-[19px] text-[var(--color-ink-soft)] leading-relaxed mt-3 md:mt-5 max-w-3xl">
              {subtitle}
            </p>
          )}
        </header>
      )}
      <div className="flex-1">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Slides                                                             */
/* ------------------------------------------------------------------ */

function HeroSlide({ goTo }: { goTo: (idx: number) => void }) {
  return (
    <section
      id="hero"
      className="min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)] scroll-mt-14 md:scroll-mt-16 flex items-center justify-center px-5 md:px-10"
    >
      <div className="max-w-3xl mx-auto text-center py-10">
        <div className="animate-float inline-block mb-6 md:mb-8">
          <Pigeon size={120} className="md:!h-[160px] md:!w-[160px]" />
        </div>
        <p className="text-[11px] md:text-[13px] uppercase tracking-[0.2em] text-[var(--color-sage-deep)] font-medium mb-3 md:mb-4">
          For the EUR hackathon
        </p>
        <h1 className="display text-[34px] md:text-[58px] lg:text-[72px] leading-[1.02] mb-4 md:mb-6">
          How HOMING works
          <br />
          <span className="text-[var(--color-sage)]">under the hood.</span>
        </h1>
        <p className="text-[14px] md:text-[19px] lg:text-[21px] text-[var(--color-ink-soft)] leading-relaxed max-w-2xl mx-auto">
          Four pipelines move a 90-second voice note into a real-life
          meet-up. Voice gets captured, language gets understood, a graph
          finds the people, and verification keeps everyone safe before
          details are shared.
        </p>

        <div className="mt-10 md:mt-14 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => goTo(1)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-sage)] text-white text-[14px] md:text-[15px] font-medium hover:bg-[var(--color-sage-deep)] transition-colors"
          >
            Start the walkthrough
            <ArrowRight size={16} />
          </button>
          <div className="inline-flex items-center gap-2 text-[11.5px] md:text-[13px] text-[var(--color-muted)]">
            <span>or press</span>
            <kbd className="px-2 py-0.5 rounded bg-[var(--color-cream-warm)] border border-[var(--color-line)] font-mono text-[var(--color-ink-soft)]">
              →
            </kbd>
            <span>to advance</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function StackSlide() {
  return (
    <Slide
      id="stack"
      eyebrow="01 / Architecture"
      title="Stack at a glance"
      subtitle="Four pipelines, each owning one transformation. Each box can be swapped without touching the others."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
        <StackTile
          index="01"
          tone="sage"
          icon={<Mic size={18} className="md:hidden" />}
          label="Capture voice"
          tech="MediaRecorder · Opus · WebM"
        />
        <StackTile
          index="02"
          tone="sky"
          icon={<Brain size={18} />}
          label="Understand language"
          tech="ElevenLabs Scribe → gpt-oss:120b"
        />
        <StackTile
          index="03"
          tone="clay"
          icon={<Network size={18} />}
          label="Match people"
          tech="Graph DB · Cypher · multi-hop"
        />
        <StackTile
          index="04"
          tone="sand"
          icon={<Sparkles size={18} />}
          label="Connect & verify"
          tech="iDIN · ID+selfie · zero-knowledge"
        />
      </div>

      <div className="mt-10 md:mt-14 grid md:grid-cols-3 gap-3 md:gap-4">
        <BigStat value="90s" caption="Voice sample" />
        <BigStat value="2-step" caption="LLM extraction" />
        <BigStat value="< 1s" caption="Graph match latency target" />
      </div>
    </Slide>
  );
}

function BigStat({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="card p-4 md:p-6 text-center">
      <p className="display text-[34px] md:text-[48px] lg:text-[56px] leading-none text-[var(--color-sage-deep)]">
        {value}
      </p>
      <p className="text-[12px] md:text-[14px] text-[var(--color-muted)] mt-1.5 md:mt-2.5 uppercase tracking-wider">
        {caption}
      </p>
    </div>
  );
}

function AudioSlide() {
  return (
    <Slide
      id="audio"
      eyebrow="02 / Pipeline"
      title="Voice → Transcript"
      subtitle="We treat the recording as ephemeral. Audio bytes live only as long as they need to."
    >
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-10">
        <Card className="!p-5 md:!p-7">
          <AudioWave className="mb-5 md:mb-7" />
          <FlowStep
            n={1}
            title="Tap the mic"
            body="MediaRecorder spins up a capture stream from the browser's microphone permission. No native shell, no native SDK."
            tech="navigator.mediaDevices.getUserMedia()"
          />
          <FlowStep
            n={2}
            title="Stream chunks to memory"
            body="Audio is encoded as Opus inside a WebM container. Chunks accumulate in a Blob — never written to disk."
            tech="MediaRecorder · audio/webm;codecs=opus"
          />
          <FlowStep
            n={3}
            title="Stash the blob for handoff"
            body="When recording stops, the Blob is held in a module-level variable so the next page can read it without serialising through history state."
            tech="lib/audioStash.ts"
          />
          <FlowStep
            n={4}
            title="POST to /api/transcribe"
            body="Multipart form-data upload to a Vercel function. The function forwards the audio to ElevenLabs Scribe and proxies the JSON back."
            tech="fetch · FormData · app/api/transcribe"
          />
          <FlowStep
            n={5}
            title="Speech-to-text"
            body="ElevenLabs Scribe (scribe_v1) returns a transcript with word-level timestamps. We discard timestamps and keep the text."
            tech="api.elevenlabs.io/v1/speech-to-text"
          />
          <FlowStep
            n={6}
            title="Transcript returned"
            body="UTF-8 string handed to the analysis pipeline. The audio Blob is dropped — never persisted server-side."
            tech="utf-8 · no audio retention"
            last
          />
        </Card>

        <div className="grid gap-4 md:gap-5 content-start">
          <Card className="!bg-[var(--color-cream-warm)] !border-transparent">
            <p className="text-[11px] md:text-[12.5px] uppercase tracking-[0.18em] text-[var(--color-sage-deep)] font-medium mb-2">
              Production promise
            </p>
            <p className="text-[13.5px] md:text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
              In the production build, the transcription model runs locally
              via WebAssembly (Whisper-small). The demo routes to Scribe so
              we can ship today — same input, same output shape.
            </p>
          </Card>
          <Card>
            <p className="text-[11px] md:text-[12.5px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium mb-2">
              What never leaves the device
            </p>
            <ul className="text-[13.5px] md:text-[15px] text-[var(--color-ink-soft)] leading-relaxed list-disc pl-5 space-y-1">
              <li>The raw audio Blob</li>
              <li>Recording timestamps</li>
              <li>Mic device identifier</li>
            </ul>
          </Card>
        </div>
      </div>
    </Slide>
  );
}

function NlpSlide() {
  return (
    <Slide
      id="nlp"
      eyebrow="03 / Pipeline"
      title="Transcript → Atomic topics"
      subtitle="The model has one job: split what you said into separable interests so the graph can index each one independently."
    >
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
        <Card className="!p-5 md:!p-7">
          <FlowStep
            n={1}
            title="Send transcript"
            body="JSON POST to /api/analyze. We also pass a demoMode flag that pads short transcripts with sensible context for short hackathon recordings."
            tech="POST /api/analyze"
          />
          <FlowStep
            n={2}
            title="Call Ollama Cloud"
            body="OpenAI-compatible endpoint, gpt-oss:120b model. response_format=json_object so we never have to parse free text."
            tech="ollama.com/v1 · gpt-oss:120b"
          />
          <FlowStep
            n={3}
            title="Atomic separation rule"
            body="The system prompt drills the model with explicit examples: 'cooking' and 'Korean food' are TWO topics, 'board games' and 'Catan' are TWO topics."
            tech="prompt-engineered atomicity"
          />
          <FlowStep
            n={4}
            title="Structured response"
            body="Returns topics with explanations + tag arrays, plus minor interests, languages, activity types, and three concrete activity suggestions."
            tech="JSON · zod-validated client-side"
            last
          />
        </Card>

        <div className="grid gap-4 md:gap-5 content-start">
          <CodeSnippet
            lang="System prompt (excerpt)"
            code={`Return JSON. Split into ATOMIC topics —
each interest standing on its own:

  • "Cooking" and "Korean food" are TWO topics.
  • "Board games" and "Catan" are TWO topics
    ("Catan" is more specific).

For each topic emit:
  title, explanation, tags[]
Then propose 3 concrete one-off activities.`}
          />
          <CodeSnippet
            lang="Sample response"
            code={`{
  "topics": [
    {
      "title": "Catan",
      "explanation": "Wants a chill round again.",
      "tags": ["catan", "specific game"]
    },
    {
      "title": "Board games",
      "explanation": "Casual strategy, low-pressure.",
      "tags": ["board games", "strategy"]
    }
  ],
  "activities": [
    { "title": "Start a Catan round", ... }
  ]
}`}
          />
        </div>
      </div>
    </Slide>
  );
}

function GraphSlide() {
  return (
    <Slide
      id="graph"
      eyebrow="04 / Pipeline"
      title="Topics → People"
      subtitle="Interests are many-to-many, friendship is sparse, and avoid-pairs are private. That's a graph problem, not a SQL one."
    >
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 mb-8">
        <Card className="!p-5 md:!p-7">
          <div className="flex items-center gap-2 mb-4">
            <Database
              size={16}
              className="text-[var(--color-sage-deep)]"
            />
            <p className="text-[13px] md:text-[15px] font-medium">
              Schema · 4 node types, 5 edge types
            </p>
          </div>
          <div className="grid gap-2 md:gap-3 mb-5">
            <NodeRow label=":User" hint="account, age band, languages" />
            <NodeRow label=":Topic" hint="atomic interest extracted by LLM" />
            <NodeRow
              label=":Activity"
              hint="one-off plan with required topics"
            />
            <NodeRow
              label=":TimeSlot"
              hint="availability window per user"
            />
          </div>
          <p className="text-[12px] md:text-[13.5px] text-[var(--color-muted)] uppercase tracking-wider mb-2">
            Edges
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            <Pill>:LIKES (User → Topic)</Pill>
            <Pill>:REQUIRES (Activity → Topic)</Pill>
            <Pill>:AVAILABLE_AT (User → TimeSlot)</Pill>
            <Pill>:ACCEPTED (User → Activity)</Pill>
            <Pill>:AVOID (User ↔ User, private)</Pill>
          </div>
        </Card>

        <Card className="!p-5 md:!p-7">
          <p className="text-[13px] md:text-[15px] font-medium mb-4">
            One match query, visualised
          </p>
          <MatchGraph className="mb-4 md:mb-5" />
          <p className="text-[13px] md:text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
            The activity declares its{" "}
            <code className="font-mono text-[12px] md:text-[13.5px]">
              :REQUIRES
            </code>{" "}
            edges to topics. We traverse to users who{" "}
            <code className="font-mono text-[12px] md:text-[13.5px]">
              :LIKES
            </code>{" "}
            any of those topics. Score is the number of distinct topics
            matched — U2 and U3 win because they like two of the three
            required topics.
          </p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 lg:gap-10">
        <CodeSnippet
          lang="Cypher · match query"
          code={`MATCH (a:Activity {id: $aid})-[:REQUIRES]->(t:Topic)
      <-[:LIKES]-(u:User)
WHERE u.id <> $creator
  AND any(l IN a.languages WHERE l IN u.languages)
  AND NOT (u)-[:AVOID]-(:User {id: $creator})
  AND (u)-[:AVAILABLE_AT]->(:TimeSlot {day: a.day})
RETURN u.id, count(DISTINCT t) AS score
ORDER BY score DESC
LIMIT 5;`}
        />
        <div className="grid gap-3">
          <WhyGraph
            title="Multi-hop without joins"
            body="Friend-of-friend pathing is one extra hop, not a recursive CTE."
          />
          <WhyGraph
            title="Private edges, real privacy"
            body=":AVOID edges are user-scoped — never exposed in match output, just filtered."
          />
          <WhyGraph
            title="Sparse and dense both fast"
            body="Most users like few topics; index lookups beat join planning."
          />
        </div>
      </div>
    </Slide>
  );
}

function PrivacySlide() {
  return (
    <Slide
      id="privacy"
      eyebrow="05 / Boundaries"
      title="Where the data lives"
      subtitle="We log only what makes the next match better. ID documents and selfies never touch our storage."
    >
      <div className="grid md:grid-cols-3 gap-4 md:gap-5 mb-10">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={15} className="text-[var(--color-sage-deep)]" />
            <p className="text-[13px] md:text-[15px] font-medium">
              On-device
            </p>
          </div>
          <ResidencyRow
            label="Raw audio recording"
            where="MediaRecorder Blob, dropped after upload"
            tone="device"
          />
          <ResidencyRow
            label="Transcription model (prod)"
            where="WebAssembly Whisper in browser"
            tone="device"
          />
          <ResidencyRow
            label="Topic edits"
            where="Local state until 'Looks right'"
            tone="device"
          />
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Cloud size={15} className="text-[#3b5a73]" />
            <p className="text-[13px] md:text-[15px] font-medium">Server</p>
          </div>
          <ResidencyRow
            label="Atomic topics (text)"
            where="Graph :Topic nodes attached to your :User"
            tone="server"
          />
          <ResidencyRow
            label="Activity records"
            where="Graph :Activity nodes with :REQUIRES edges"
            tone="server"
          />
          <ResidencyRow
            label="Verified-true flag"
            where="One boolean on your :User node"
            tone="server"
          />
        </Card>

        <Card className="border-[var(--color-clay)]">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={15} className="text-[#7d4730]" />
            <p className="text-[13px] md:text-[15px] font-medium">
              Never stored
            </p>
          </div>
          <ResidencyRow
            label="ID document"
            where="Provider returns true/false only"
            tone="never"
          />
          <ResidencyRow
            label="Selfie photo"
            where="Liveness check happens on-device"
            tone="never"
          />
          <ResidencyRow
            label="Full legal name"
            where="We keep first name; nothing else"
            tone="never"
          />
        </Card>
      </div>

      <div className="rounded-3xl bg-[var(--color-sage)] text-white px-6 md:px-10 py-8 md:py-12 text-center">
        <p className="text-[11px] md:text-[13px] uppercase tracking-[0.2em] opacity-80 mb-3">
          Built for the EUR hackathon
        </p>
        <p className="display text-[24px] md:text-[34px] lg:text-[40px] leading-tight mb-5 md:mb-6 max-w-2xl mx-auto">
          Activity-first. Profile never. Built to be deleted.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
          <Link
            href="/voice"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[var(--color-sage-deep)] text-[14px] md:text-[15px] font-medium hover:bg-[var(--color-cream-warm)] transition-colors"
          >
            See the demo
            <ArrowUpRight size={16} />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-transparent border border-white/40 text-white text-[14px] md:text-[15px] font-medium hover:bg-white/10 transition-colors"
          >
            <Home size={14} />
            Back to landing
          </Link>
        </div>
        <p className="text-[11px] md:text-[12.5px] opacity-70 mt-6 md:mt-8 font-mono">
          Next 15 · TS · Tailwind v4 · Ollama · ElevenLabs · graph DB
        </p>
      </div>
    </Slide>
  );
}

/* ------------------------------------------------------------------ */
/*  Small bits used inside slides                                      */
/* ------------------------------------------------------------------ */

function NodeRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-2 md:py-1">
      <code className="text-[12.5px] md:text-[14px] font-mono text-[var(--color-sage-deep)]">
        {label}
      </code>
      <span className="text-[12px] md:text-[13.5px] text-[var(--color-muted)] text-right">
        {hint}
      </span>
    </div>
  );
}

function WhyGraph({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-outline p-3.5 md:p-4">
      <p className="text-[13px] md:text-[15px] font-medium mb-0.5 md:mb-1">
        {title}
      </p>
      <p className="text-[12.5px] md:text-[14px] text-[var(--color-ink-soft)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}
