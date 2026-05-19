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
  Check,
  X,
  Scale,
  ShieldCheck,
  Calendar,
  Coins,
  Code2,
  UserCheck,
  FileCheck,
} from "lucide-react";
import { Card } from "@/components/Bits";
import { Pigeon, PigeonMark } from "@/components/Pigeon";
import {
  FlowStep,
  StageBlock,
  DataArrow,
  CodeSnippet,
  ResidencyRow,
  AudioWave,
} from "@/components/Diagrams";
import { InteractiveGraph } from "@/components/InteractiveGraph";

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
  { id: "ethics", label: "Ethics" },
  { id: "compliance", label: "Compliance" },
  { id: "ship", label: "Ship" },
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
        <PrinciplesSlide />
        <ComplianceSlide />
        <ShipSlide />
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
      eyebrow="00 / Summary"
      title="From a 90-second voice note to a real meet-up"
      subtitle="One slide. Four pipelines. Three providers. One graph. Everything below is a visual you can point at."
    >
      {/* Pipeline visual */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-2 lg:gap-1 items-stretch mb-6 md:mb-8">
        <StageBlock
          number="01"
          tone="sage"
          icon={<Mic size={32} />}
          name="Voice in"
          tech="MediaRecorder · Opus"
        />
        <DataArrow label="audio" />
        <StageBlock
          number="02"
          tone="sky"
          icon={<Brain size={32} />}
          name="Make sense"
          tech="Scribe · gpt-oss"
        />
        <DataArrow label="topics" />
        <StageBlock
          number="03"
          tone="clay"
          icon={<Network size={32} />}
          name="Find people"
          tech="Graph DB · Cypher"
        />
        <DataArrow label="candidates" />
        <StageBlock
          number="04"
          tone="sand"
          icon={<Sparkles size={32} />}
          name="Meet for real"
          tech="iDIN · selfie"
        />
      </div>

      {/* Three visual panels: API + LLM, Database, Security */}
      <div className="grid lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <ApiFlowPanel />
        <SchemaPreviewPanel />
        <SecurityZonesPanel />
      </div>

      {/* Graph-as-spine callout (compact) */}
      <div className="rounded-3xl bg-[var(--color-cream-warm)] border border-[var(--color-line)] p-4 md:p-5">
        <div className="flex items-center gap-3 md:gap-4">
          <span className="grid place-items-center h-10 w-10 md:h-11 md:w-11 rounded-2xl bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)] shrink-0">
            <Database size={16} />
          </span>
          <p className="text-[13px] md:text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
            <span className="font-medium text-[var(--color-ink)]">
              One source of truth.
            </span>{" "}
            Every stage writes to the same graph and reads what the others
            wrote. Any one pipeline can be rewritten in isolation.
          </p>
        </div>
      </div>
    </Slide>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary-slide panels — three visuals, no prose                     */
/* ------------------------------------------------------------------ */

function ApiFlowPanel() {
  return (
    <Card className="!p-4 md:!p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <span className="grid place-items-center h-9 w-9 rounded-2xl bg-[var(--color-sky-soft)] text-[#3b5a73]">
          <Code2 size={16} />
        </span>
        <p className="text-[13px] md:text-[15px] font-medium">API + LLM calls</p>
      </div>

      <svg
        viewBox="0 0 320 180"
        className="w-full h-auto"
        role="img"
        aria-label="HOMING client calls three endpoints — transcribe goes to ElevenLabs Scribe, analyze and suggest both go to Ollama gpt-oss:120b."
      >
        {/* Connector curves: client → providers */}
        <path
          d="M 92 56 C 150 56, 160 32, 212 32"
          stroke="#3b5a73"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M 92 90 C 150 90, 160 92, 212 92"
          stroke="#4f7942"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M 92 124 C 150 124, 160 152, 212 152"
          stroke="#4f7942"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Endpoint labels — centered between client (ends x=92) and providers (start x=212) */}
        <text
          x="152"
          y="22"
          textAnchor="middle"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill="#3b5a73"
        >
          POST /api/transcribe
        </text>
        <text
          x="152"
          y="82"
          textAnchor="middle"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill="#2f4926"
        >
          POST /api/analyze
        </text>
        <text
          x="152"
          y="142"
          textAnchor="middle"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill="#2f4926"
        >
          POST /api/suggest
        </text>

        {/* Client node */}
        <rect x="14" y="62" width="78" height="56" rx="14" fill="#1b1d1c" />
        <text x="53" y="86" textAnchor="middle" fontSize="11" fill="white" fontWeight="600" fontFamily="ui-sans-serif, system-ui">
          HOMING
        </text>
        <text x="53" y="100" textAnchor="middle" fontSize="9" fill="white" opacity="0.7" fontFamily="ui-monospace, monospace">
          :client
        </text>

        {/* Provider nodes */}
        <rect x="212" y="14" width="96" height="36" rx="10" fill="#dbe7ee" stroke="#3b5a73" strokeWidth="1.2" />
        <text x="260" y="30" textAnchor="middle" fontSize="11" fontWeight="600" fill="#3b5a73" fontFamily="ui-sans-serif, system-ui">
          ElevenLabs
        </text>
        <text x="260" y="42" textAnchor="middle" fontSize="9" fill="#3b5a73" opacity="0.85" fontFamily="ui-monospace, monospace">
          Scribe · v1
        </text>

        <rect x="212" y="74" width="96" height="36" rx="10" fill="#e0e9d6" stroke="#4f7942" strokeWidth="1.2" />
        <text x="260" y="90" textAnchor="middle" fontSize="11" fontWeight="600" fill="#2f4926" fontFamily="ui-sans-serif, system-ui">
          Ollama
        </text>
        <text x="260" y="102" textAnchor="middle" fontSize="9" fill="#2f4926" opacity="0.85" fontFamily="ui-monospace, monospace">
          gpt-oss:120b
        </text>

        <rect x="212" y="134" width="96" height="36" rx="10" fill="#e0e9d6" stroke="#4f7942" strokeWidth="1.2" />
        <text x="260" y="150" textAnchor="middle" fontSize="11" fontWeight="600" fill="#2f4926" fontFamily="ui-sans-serif, system-ui">
          Ollama
        </text>
        <text x="260" y="162" textAnchor="middle" fontSize="9" fill="#2f4926" opacity="0.85" fontFamily="ui-monospace, monospace">
          gpt-oss:120b
        </text>
      </svg>

      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[var(--color-line)]">
        <PanelChip>json_object</PanelChip>
        <PanelChip>0-day retention</PanelChip>
        <PanelChip>on-device fallback</PanelChip>
      </div>
    </Card>
  );
}

function SchemaPreviewPanel() {
  return (
    <Card className="!p-4 md:!p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <span className="grid place-items-center h-9 w-9 rounded-2xl bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
          <Database size={16} />
        </span>
        <p className="text-[13px] md:text-[15px] font-medium">Graph schema</p>
      </div>

      <svg
        viewBox="0 0 280 180"
        className="w-full h-auto"
        role="img"
        aria-label="Schema graph: Activity connects to Topic via REQUIRES and to TimeSlot via SCHEDULED_AT. User connects to Topic via LIKES and to TimeSlot via AVAILABLE_AT. Users connect to each other via private AVOID edges."
      >
        {/* Edges */}
        <line x1="140" y1="36" x2="60" y2="90" stroke="#4f7942" strokeWidth="1.6" />
        <text x="80" y="58" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="#2f4926">
          :REQUIRES
        </text>

        <line x1="140" y1="36" x2="220" y2="90" stroke="#3b5a73" strokeWidth="1.4" strokeDasharray="4 3" />
        <text x="174" y="58" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="#3b5a73">
          :SCHEDULED_AT
        </text>

        <line x1="140" y1="146" x2="60" y2="90" stroke="#8a8a85" strokeWidth="1.2" />
        <text x="76" y="128" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="#8a8a85">
          :LIKES
        </text>

        <line x1="140" y1="146" x2="220" y2="90" stroke="#b8975f" strokeWidth="1.2" strokeDasharray="3 3" />
        <text x="170" y="128" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="#8a7438">
          :AVAILABLE_AT
        </text>

        {/* AVOID self-loop on user */}
        <path
          d="M 165 152 C 200 175, 168 175, 152 162"
          stroke="#c97e63"
          strokeWidth="1.2"
          strokeDasharray="2 3"
          fill="none"
        />
        <text x="178" y="174" fontSize="8.5" fontFamily="ui-monospace, monospace" fill="#7d4730">
          :AVOID
        </text>

        {/* Nodes */}
        <SchemaNode x={140} y={28} w={88} h={26} fill="#4f7942" stroke="#2f4926" textFill="white" label=":Activity" />
        <SchemaNode x={60}  y={90} w={70} h={24} fill="#e0e9d6" stroke="#4f7942" textFill="#2f4926" label=":Topic" />
        <SchemaNode x={220} y={90} w={80} h={24} fill="#ead9bf" stroke="#b8975f" textFill="#6a5326" label=":TimeSlot" />
        <SchemaNode x={140} y={152} w={66} h={26} fill="#ffffff" stroke="#8fb3c9" textFill="#1b1d1c" label=":User" />
      </svg>

      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[var(--color-line)]">
        <PanelChip>4 node types</PanelChip>
        <PanelChip>5 edge types</PanelChip>
        <PanelChip>multi-hop ready</PanelChip>
      </div>
    </Card>
  );
}

function SchemaNode({
  x,
  y,
  w,
  h,
  fill,
  stroke,
  textFill,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  textFill: string;
  label: string;
}) {
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.4"
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize="11"
        fill={textFill}
        fontWeight="600"
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </g>
  );
}

function SecurityZonesPanel() {
  return (
    <Card className="!p-4 md:!p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <span className="grid place-items-center h-9 w-9 rounded-2xl bg-[var(--color-clay-soft)] text-[#7d4730]">
          <ShieldCheck size={16} />
        </span>
        <p className="text-[13px] md:text-[15px] font-medium">
          Security & GDPR
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <ZoneCol
          tone="device"
          icon={<Cpu size={14} />}
          title="Device"
          items={["audio", "Whisper", "edits"]}
        />
        <ZoneCol
          tone="server"
          icon={<Cloud size={14} />}
          title="Server"
          items={["topics", "verified"]}
        />
        <ZoneCol
          tone="never"
          icon={<X size={14} />}
          title="Never"
          items={["ID doc", "selfie", "legal name"]}
        />
      </div>

      <div className="grid gap-1.5 mt-auto">
        <SecRow icon={<Lock size={12} />} label="Privacy by design · GDPR Art 25" />
        <SecRow icon={<UserCheck size={12} />} label="DPO from day one" />
        <SecRow icon={<FileCheck size={12} />} label="DPIA before public launch" />
        <SecRow icon={<Brain size={12} />} label="AI Act · limited-risk · Art 50" />
      </div>
    </Card>
  );
}

function ZoneCol({
  tone,
  icon,
  title,
  items,
}: {
  tone: "device" | "server" | "never";
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  const palette = {
    device: { bg: "var(--color-sage-soft)", fg: "var(--color-sage-deep)" },
    server: { bg: "var(--color-sky-soft)", fg: "#3b5a73" },
    never:  { bg: "var(--color-clay-soft)", fg: "#7d4730" },
  }[tone];
  return (
    <div
      className="rounded-xl px-2 py-2.5"
      style={{ background: palette.bg, color: palette.fg }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[10.5px] uppercase tracking-[0.14em] font-medium">
          {title}
        </p>
      </div>
      <ul className="grid gap-0.5 text-[10.5px] md:text-[11.5px] font-mono">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function SecRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid place-items-center h-5 w-5 rounded-full bg-[var(--color-cream-warm)] text-[var(--color-sage-deep)] shrink-0">
        {icon}
      </span>
      <span className="text-[11.5px] md:text-[12.5px] text-[var(--color-ink-soft)]">
        {label}
      </span>
    </div>
  );
}

function PanelChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] md:text-[11px] font-mono text-[var(--color-muted)] bg-[var(--color-cream-warm)] px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}

function AudioSlide() {
  return (
    <Slide
      id="audio"
      eyebrow="01 / Pipeline"
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
      eyebrow="02 / Pipeline"
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
      eyebrow="03 / Pipeline"
      title="Topics → People"
      subtitle="Interests are many-to-many, friendship is sparse, and avoid-pairs are private. That's a graph problem, not a SQL one."
    >
      {/* The graph is the star of this slide — full width, interactive. */}
      <InteractiveGraph className="mb-8 md:mb-10" />

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
      eyebrow="04 / Boundaries"
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
    </Slide>
  );
}

function PrinciplesSlide() {
  return (
    <Slide
      id="ethics"
      eyebrow="05 / Principles"
      title="What HOMING refuses to do"
      subtitle="Each refusal is a design choice. Together they're why this enables human connection instead of replacing or surveilling it — the BCG X brief made flesh."
    >
      <div className="grid gap-3 md:gap-4 mb-8 md:mb-10">
        <PrincipleRow
          rejected="Profile browsing or swiping"
          replaced="Activity-first matching — you choose what to do, the graph finds people who said they want the same thing."
        />
        <PrincipleRow
          rejected="Public popularity scores or 'social capital'"
          replaced="Match scores stay internal to the matching service. Users never rank or rate each other."
        />
        <PrincipleRow
          rejected="An AI chatbot that replaces conversation"
          replaced="Homi can draft the first message; you read it, edit it, send it. The chat is between humans from line one."
        />
        <PrincipleRow
          rejected="Notifying people that someone declined them"
          replaced="Declines are private and invisible to the declined side. No signal, no read-receipt, no shame."
        />
        <PrincipleRow
          rejected="Engagement-time as the success metric"
          replaced="Success is the group meeting without us. The /group screen literally invites you to start a WhatsApp."
        />
        <PrincipleRow
          rejected="Mixing 16-17 year olds with adults in the same pool"
          replaced="EUR pilot is 18-29 only. A younger track needs separate safeguarding before it ships."
        />
      </div>

      <div className="rounded-3xl bg-[var(--color-sage)] text-white px-5 md:px-8 py-5 md:py-7">
        <p className="text-[14px] md:text-[18px] leading-snug">
          <span className="opacity-70">The boundary isn&apos;t a feature list.</span>{" "}
          It&apos;s the product.
        </p>
      </div>
    </Slide>
  );
}

function ComplianceSlide() {
  return (
    <Slide
      id="compliance"
      eyebrow="06 / Compliance"
      title="GDPR and the AI Act, by design"
      subtitle="The architecture above is also the compliance story. Privacy by design means we satisfy these obligations as a side-effect of how the system is built — not as a bolt-on."
    >
      <div className="grid lg:grid-cols-3 gap-4 md:gap-5 mb-7 md:mb-9">
        <ComplianceCol
          icon={<Scale size={18} />}
          title="GDPR"
          articles={[
            {
              ref: "Art 6(1)(a)",
              point: "Explicit consent",
              body: "Granular, revocable per data class — voice recording, topics, matching, availability are separate toggles.",
            },
            {
              ref: "Art 17",
              point: "Right to erasure",
              body: "Deleting a :User node cascades :LIKES, :AVAILABLE_AT and :AVOID edges in one transaction.",
            },
            {
              ref: "Art 20",
              point: "Portability",
              body: "JSON export of every node and edge the user authored, downloadable from settings.",
            },
            {
              ref: "Art 25",
              point: "Privacy by design",
              body: "On-device transcription, anonymous-until-verified flow, no profile browsing.",
            },
          ]}
        />
        <ComplianceCol
          icon={<Brain size={18} />}
          title="AI Act"
          articles={[
            {
              ref: "Risk tier",
              point: "Limited-risk system",
              body: "Used to assist matching, not to grade or rank humans. Final action is always the user&apos;s.",
            },
            {
              ref: "Art 50",
              point: "Transparency",
              body: "Every Homi suggestion is labeled. Users see the topics extracted and can edit them before anything is used.",
            },
            {
              ref: "Provider",
              point: "Zero data retention",
              body: "LLM provider contract: no training on prompts, no log retention beyond 24h.",
            },
            {
              ref: "Bias audit",
              point: "Quarterly review",
              body: "Match outcomes audited by sex / language / faculty cohort. Findings published.",
            },
          ]}
        />
        <ComplianceCol
          icon={<ShieldCheck size={18} />}
          title="Operations"
          articles={[
            {
              ref: "Role",
              point: "DPO from day one",
              body: "Designated Data Protection Officer reports directly to the founders.",
            },
            {
              ref: "DPIA",
              point: "Before public launch",
              body: "Data Protection Impact Assessment, reviewed with the EUR data office.",
            },
            {
              ref: "Audit",
              point: "Annual security audit",
              body: "Third-party penetration test + report; remediation tracked publicly.",
            },
            {
              ref: "List",
              point: "Public sub-processor list",
              body: "Every vendor that touches data is named in the privacy policy with a 30-day change notice.",
            },
          ]}
        />
      </div>

      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-cream-warm)] p-4 md:p-5 flex items-start gap-3">
        <ShieldCheck
          size={18}
          className="text-[var(--color-sage-deep)] shrink-0 mt-0.5"
        />
        <p className="text-[13px] md:text-[15px] text-[var(--color-ink-soft)] leading-relaxed">
          We classify as <span className="font-medium">limited-risk</span> under
          the AI Act because the model assists with matching but the final
          action — accept, decline, verify, meet — is always a human decision.
          We publish the DPIA, the bias audit, and the sub-processor list
          before opening enrollment.
        </p>
      </div>
    </Slide>
  );
}

function ShipSlide() {
  const items: BudgetItem[] = [
    { label: "Team · 4 eng + DPO + designer × 18mo", amount: 1_100_000, tone: "sage" },
    { label: "Compliance · DPO, DPIA, legal, audits", amount: 250_000, tone: "sky" },
    { label: "Infra · cloud, LLM, verification provider", amount: 150_000, tone: "clay" },
    { label: "Pilot · launch, content, EUR partnership", amount: 200_000, tone: "sand" },
    { label: "Reserve · contingency + edge-case scope", amount: 300_000, tone: "sage" },
  ];
  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <Slide
      id="ship"
      eyebrow="07 / Delivery"
      title="€2M, 18 months, EUR-first"
      subtitle="MVP at month 3. Closed EUR pilot at month 6. Three to four Dutch universities by month 18 — under budget and politically survivable."
    >
      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
        <ShipStat value="€2.0M" caption="Total budget" tone="sage" />
        <ShipStat value="18mo" caption="To 4-uni rollout" tone="sky" />
        <ShipStat value="6 FTE" caption="Eng · DPO · design" tone="clay" />
        <ShipStat value="4 uni" caption="Dutch network · M18" tone="sand" />
      </div>

      {/* Budget breakdown + roadmap */}
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 mb-8 md:mb-10">
        <Card className="!p-5 md:!p-7">
          <div className="flex items-center gap-2 mb-4 md:mb-5">
            <Coins size={16} className="text-[var(--color-sage-deep)]" />
            <p className="text-[13px] md:text-[15px] font-medium">
              Budget · 18 months
            </p>
          </div>
          <div className="grid gap-3 md:gap-3.5 mb-4">
            {items.map((it) => (
              <BudgetRow key={it.label} item={it} total={total} />
            ))}
          </div>
          <div className="pt-3 border-t border-[var(--color-line)] flex justify-between items-baseline">
            <p className="text-[13px] md:text-[15px] font-medium">Total</p>
            <p className="text-[16px] md:text-[20px] display text-[var(--color-sage-deep)]">
              €{(total / 1_000_000).toFixed(1)}M
            </p>
          </div>
        </Card>

        <Card className="!p-5 md:!p-7">
          <div className="flex items-center gap-2 mb-4 md:mb-5">
            <Calendar size={16} className="text-[var(--color-sage-deep)]" />
            <p className="text-[13px] md:text-[15px] font-medium">Roadmap</p>
          </div>
          <div className="grid gap-3.5 md:gap-4">
            <Milestone
              range="M1–3"
              title="Production MVP"
              body="The flow you saw — voice in, topics, match, verify — hardened, monitored, documented. No public users yet."
            />
            <Milestone
              range="M4–6"
              title="Closed EUR pilot · 50 students"
              body="Hand-picked across faculties. DPIA finalised. Weekly cadence. We measure outcomes, not screens."
            />
            <Milestone
              range="M7–12"
              title="EUR open + audited"
              body="Public to all EUR students. DPIA + bias audit published. Security review by a third party."
            />
            <Milestone
              range="M13–18"
              title="3–4 Dutch universities"
              body="TU Delft, Leiden, Utrecht, Wageningen. Same product, university-scoped graphs."
              last
            />
          </div>
        </Card>
      </div>

      {/* Closing CTA — final word of the deck */}
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

function PrincipleRow({
  rejected,
  replaced,
}: {
  rejected: string;
  replaced: string;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-2.5 md:gap-3 items-stretch">
      <div className="rounded-2xl border border-[var(--color-clay-soft)] bg-white p-4 md:p-5 flex items-start gap-3">
        <span className="grid place-items-center h-7 w-7 md:h-8 md:w-8 rounded-full bg-[var(--color-clay-soft)] text-[#7d4730] shrink-0 mt-0.5">
          <X size={14} strokeWidth={3} />
        </span>
        <div>
          <p className="text-[10px] md:text-[11.5px] uppercase tracking-[0.18em] text-[#7d4730] font-medium mb-1">
            Won&apos;t do
          </p>
          <p className="text-[13.5px] md:text-[15.5px] text-[var(--color-ink)] leading-snug">
            {rejected}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--color-sage-soft)] bg-[var(--color-sage-soft)] p-4 md:p-5 flex items-start gap-3">
        <span className="grid place-items-center h-7 w-7 md:h-8 md:w-8 rounded-full bg-white text-[var(--color-sage-deep)] shrink-0 mt-0.5">
          <Check size={14} strokeWidth={3} />
        </span>
        <div>
          <p className="text-[10px] md:text-[11.5px] uppercase tracking-[0.18em] text-[var(--color-sage-deep)] font-medium mb-1">
            Instead
          </p>
          <p className="text-[13.5px] md:text-[15.5px] text-[var(--color-sage-deep)] leading-snug">
            {replaced}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ComplianceArticle {
  ref: string;
  point: string;
  body: string;
}

function ComplianceCol({
  icon,
  title,
  articles,
}: {
  icon: React.ReactNode;
  title: string;
  articles: ComplianceArticle[];
}) {
  return (
    <Card className="!p-5 md:!p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-4 md:mb-5">
        <span className="grid place-items-center h-9 w-9 rounded-2xl bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]">
          {icon}
        </span>
        <p className="text-[15px] md:text-[17px] font-medium">{title}</p>
      </div>
      <div className="grid gap-3.5 md:gap-4">
        {articles.map((a) => (
          <div key={a.ref}>
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-mono text-[10.5px] md:text-[11.5px] uppercase tracking-wider text-[var(--color-sage-deep)]">
                {a.ref}
              </span>
              <span className="text-[12.5px] md:text-[14px] font-medium">
                {a.point}
              </span>
            </div>
            <p className="text-[12.5px] md:text-[14px] text-[var(--color-ink-soft)] leading-relaxed">
              {a.body}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface BudgetItem {
  label: string;
  amount: number;
  tone: "sage" | "sky" | "clay" | "sand";
}

const TONE_BG: Record<BudgetItem["tone"], string> = {
  sage: "var(--color-sage)",
  sky: "#8fb3c9",
  clay: "#c97e63",
  sand: "#b8975f",
};

function BudgetRow({ item, total }: { item: BudgetItem; total: number }) {
  const pct = Math.round((item.amount / total) * 100);
  const amountStr =
    item.amount >= 1_000_000
      ? `€${(item.amount / 1_000_000).toFixed(1)}M`
      : `€${(item.amount / 1_000).toFixed(0)}K`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[12.5px] md:text-[14px] text-[var(--color-ink-soft)]">
          {item.label}
        </span>
        <span className="text-[12.5px] md:text-[14px] tabular-nums font-medium shrink-0">
          {amountStr}{" "}
          <span className="text-[var(--color-muted)] font-normal">· {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-line)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: TONE_BG[item.tone],
          }}
        />
      </div>
    </div>
  );
}

function Milestone({
  range,
  title,
  body,
  last,
}: {
  range: string;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3 md:gap-4">
      <div className="flex flex-col items-center shrink-0">
        <span className="font-mono text-[11px] md:text-[12.5px] text-[var(--color-sage-deep)] bg-[var(--color-sage-soft)] px-2 py-1 rounded-full">
          {range}
        </span>
        {!last && (
          <div className="flex-1 w-px bg-[var(--color-line)] mt-1.5" />
        )}
      </div>
      <div className={"flex-1 " + (last ? "" : "pb-1")}>
        <p className="text-[14px] md:text-[15.5px] font-medium leading-tight mb-1">
          {title}
        </p>
        <p className="text-[12.5px] md:text-[14px] text-[var(--color-ink-soft)] leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  );
}

const SHIP_STAT_TONES: Record<BudgetItem["tone"], { bg: string; fg: string }> = {
  sage: { bg: "var(--color-sage-soft)", fg: "var(--color-sage-deep)" },
  sky:  { bg: "var(--color-sky-soft)",  fg: "#3b5a73" },
  clay: { bg: "var(--color-clay-soft)", fg: "#7d4730" },
  sand: { bg: "var(--color-sand)",      fg: "#6a5326" },
};

function ShipStat({
  value,
  caption,
  tone,
}: {
  value: string;
  caption: string;
  tone: BudgetItem["tone"];
}) {
  const palette = SHIP_STAT_TONES[tone];
  return (
    <div
      className="rounded-2xl p-4 md:p-5 text-center"
      style={{ background: palette.bg, color: palette.fg }}
    >
      <p
        className="display text-[26px] md:text-[36px] lg:text-[42px] leading-none"
        style={{ color: palette.fg }}
      >
        {value}
      </p>
      <p
        className="text-[11px] md:text-[12.5px] uppercase tracking-[0.14em] mt-2 md:mt-2.5 opacity-85"
        style={{ color: palette.fg }}
      >
        {caption}
      </p>
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
