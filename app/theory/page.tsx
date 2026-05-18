"use client";

import Link from "next/link";
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
} from "lucide-react";
import { AppShell, Section } from "@/components/AppShell";
import { Card, PrimaryButton, Pill } from "@/components/Bits";
import { Pigeon } from "@/components/Pigeon";
import {
  FlowStep,
  StackTile,
  CodeSnippet,
  ResidencyRow,
  MatchGraph,
  AudioWave,
} from "@/components/Diagrams";

export default function Theory() {
  return (
    <AppShell back="/" title="Under the hood">
      {/* Hero */}
      <Section className="mb-7">
        <div className="relative h-28 mb-4 grid place-items-center">
          <div className="animate-float">
            <Pigeon size={84} />
          </div>
        </div>
        <h1 className="display text-[28px] leading-tight text-center px-2">
          How HOMING works under the hood
        </h1>
        <p className="text-[13.5px] text-[var(--color-ink-soft)] text-center mt-3 px-2 leading-relaxed">
          Four pipelines move a 90-second voice note into a real-life meet-up.
          Voice gets captured, language gets understood, a graph finds the
          people, and a verification step keeps everyone safe before details
          are shared.
        </p>
      </Section>

      {/* Stack at a glance */}
      <Section>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium mb-3 px-1">
          Stack at a glance
        </p>
        <div className="grid gap-2.5 mb-7">
          <StackTile
            index="01"
            tone="sage"
            icon={<Mic size={18} />}
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
      </Section>

      {/* Section 1: Audio pipeline */}
      <Section>
        <div className="flex items-center gap-3 mb-1">
          <span className="grid place-items-center h-9 w-9 rounded-2xl bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
            <Mic size={16} />
          </span>
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium">
              Pipeline 01
            </p>
            <h2 className="display text-[20px] leading-tight">
              Voice → Transcript
            </h2>
          </div>
        </div>
        <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed mb-4 ml-12">
          We treat the recording as ephemeral. Audio bytes live only as long as
          they need to.
        </p>

        <Card className="mb-4">
          <AudioWave className="mb-4" />
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

        <Card className="!bg-[var(--color-cream-warm)] !border-transparent mb-7">
          <p className="text-[12px] font-medium mb-1 text-[var(--color-ink)]">
            Production promise
          </p>
          <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
            In the production build, the transcription model runs locally via
            WebAssembly (Whisper-small). The demo routes to Scribe so we can
            ship today — same input, same output shape.
          </p>
        </Card>
      </Section>

      {/* Section 2: Topic extraction */}
      <Section>
        <div className="flex items-center gap-3 mb-1">
          <span className="grid place-items-center h-9 w-9 rounded-2xl bg-[var(--color-sky-soft)] text-[#3b5a73]">
            <Brain size={16} />
          </span>
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium">
              Pipeline 02
            </p>
            <h2 className="display text-[20px] leading-tight">
              Transcript → Atomic topics
            </h2>
          </div>
        </div>
        <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed mb-4 ml-12">
          The model has one job: split what you said into separable interests
          so the graph can index each one independently.
        </p>

        <Card className="mb-4">
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

        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium mb-2 px-1">
          What the model sees
        </p>
        <div className="mb-3">
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
        </div>
        <div className="mb-7">
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
      </Section>

      {/* Section 3: Graph DB matching */}
      <Section>
        <div className="flex items-center gap-3 mb-1">
          <span className="grid place-items-center h-9 w-9 rounded-2xl bg-[var(--color-clay-soft)] text-[#7d4730]">
            <Network size={16} />
          </span>
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium">
              Pipeline 03
            </p>
            <h2 className="display text-[20px] leading-tight">
              Topics → People
            </h2>
          </div>
        </div>
        <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed mb-4 ml-12">
          Interests are many-to-many, friendship is sparse, and avoid-pairs are
          private. That&apos;s a graph problem, not a SQL one.
        </p>

        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Database
              size={14}
              className="text-[var(--color-sage-deep)]"
            />
            <p className="text-[12.5px] font-medium">
              Schema (4 node types, 5 edge types)
            </p>
          </div>
          <div className="grid gap-1.5 mb-4">
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
          <p className="text-[12px] text-[var(--color-muted)] mb-2">
            Edges
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Pill>:LIKES (User → Topic)</Pill>
            <Pill>:REQUIRES (Activity → Topic)</Pill>
            <Pill>:AVAILABLE_AT (User → TimeSlot)</Pill>
            <Pill>:ACCEPTED (User → Activity)</Pill>
            <Pill>:AVOID (User ↔ User, private)</Pill>
          </div>
        </Card>

        <Card className="mb-4">
          <p className="text-[12.5px] font-medium mb-3">
            One match query, visualised
          </p>
          <MatchGraph className="mb-4" />
          <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
            The activity declares its <code className="font-mono text-[11.5px]">:REQUIRES</code> edges
            to topics. We traverse to users who{" "}
            <code className="font-mono text-[11.5px]">:LIKES</code> any of
            those topics. Score is just the number of distinct topics matched
            — U2 and U3 win because they like two of the three required
            topics.
          </p>
        </Card>

        <div className="mb-4">
          <CodeSnippet
            lang="Cypher (match query)"
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
        </div>

        <div className="grid gap-2.5 mb-7">
          <WhyGraph
            title="Multi-hop without joins"
            body="Friend-of-friend pathing (later feature) is one extra hop, not a recursive CTE."
          />
          <WhyGraph
            title="Private edges, real privacy"
            body=":AVOID edges are user-scoped writes — never exposed in match output, just filtered."
          />
          <WhyGraph
            title="Sparse and dense both fast"
            body="Most users like few topics; most topics have few users. Index lookups beat join planning."
          />
        </div>
      </Section>

      {/* Section 4: Privacy & data residency */}
      <Section>
        <div className="flex items-center gap-3 mb-1">
          <span className="grid place-items-center h-9 w-9 rounded-2xl bg-[var(--color-sand)] text-[#6a5326]">
            <Lock size={16} />
          </span>
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium">
              Pipeline 04
            </p>
            <h2 className="display text-[20px] leading-tight">
              Where the data lives
            </h2>
          </div>
        </div>
        <p className="text-[13px] text-[var(--color-ink-soft)] leading-relaxed mb-4 ml-12">
          We log only what makes the next match better. ID documents and
          selfies never touch our storage.
        </p>

        <Card className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-[var(--color-sage-deep)]" />
            <p className="text-[12.5px] font-medium">On-device</p>
          </div>
          <ResidencyRow
            label="Raw audio recording"
            where="MediaRecorder Blob, dropped after upload"
            tone="device"
          />
          <ResidencyRow
            label="Transcription model (prod)"
            where="WebAssembly Whisper, runs in the browser"
            tone="device"
          />
          <ResidencyRow
            label="Topic edits"
            where="Local state, written to graph only after you press 'Looks right'"
            tone="device"
          />
        </Card>

        <Card className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Cloud size={14} className="text-[#3b5a73]" />
            <p className="text-[12.5px] font-medium">Server</p>
          </div>
          <ResidencyRow
            label="Atomic topics (text)"
            where="Graph DB :Topic nodes, attached to your :User"
            tone="server"
          />
          <ResidencyRow
            label="Activity records"
            where="Graph DB :Activity nodes with :REQUIRES edges"
            tone="server"
          />
          <ResidencyRow
            label="Verified-true flag"
            where="One boolean on your :User node"
            tone="server"
          />
        </Card>

        <Card className="mb-7 border-[var(--color-clay)]">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={14} className="text-[#7d4730]" />
            <p className="text-[12.5px] font-medium">Never stored</p>
          </div>
          <ResidencyRow
            label="ID document or document number"
            where="Verification provider returns true/false only"
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
      </Section>

      {/* CTA */}
      <Link href="/voice" className="block">
        <PrimaryButton>
          See the demo
          <ArrowRight size={14} />
        </PrimaryButton>
      </Link>
      <p className="text-[11.5px] text-[var(--color-muted)] text-center mt-3">
        Built for the EUR hackathon · stack: Next 15 · TS · Tailwind v4 ·
        Ollama · ElevenLabs · graph DB
      </p>
    </AppShell>
  );
}

function NodeRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <code className="text-[12px] font-mono text-[var(--color-sage-deep)]">
        {label}
      </code>
      <span className="text-[12px] text-[var(--color-muted)] text-right">
        {hint}
      </span>
    </div>
  );
}

function WhyGraph({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-outline p-3">
      <p className="text-[13px] font-medium mb-0.5">{title}</p>
      <p className="text-[12.5px] text-[var(--color-ink-soft)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}
