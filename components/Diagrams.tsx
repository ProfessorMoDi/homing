"use client";

import type { ReactElement, ReactNode } from "react";

interface FlowStepProps {
  n: number | string;
  title: string;
  body: string;
  tech?: string;
  highlight?: boolean;
  last?: boolean;
}

export function FlowStep({
  n,
  title,
  body,
  tech,
  highlight,
  last,
}: FlowStepProps) {
  return (
    <div className="relative flex gap-4 md:gap-5">
      <div className="flex flex-col items-center">
        <div
          className={
            "grid place-items-center h-9 w-9 md:h-11 md:w-11 rounded-full text-[13px] md:text-[15px] font-semibold shrink-0 " +
            (highlight
              ? "bg-[var(--color-sage)] text-white"
              : "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]")
          }
        >
          {n}
        </div>
        {!last && (
          <div className="flex-1 w-px bg-[var(--color-line)] mt-1.5" />
        )}
      </div>
      <div className={"flex-1 " + (last ? "" : "pb-5 md:pb-6")}>
        <p className="text-[14.5px] md:text-[17px] font-medium text-[var(--color-ink)]">
          {title}
        </p>
        <p className="text-[13px] md:text-[14.5px] text-[var(--color-ink-soft)] leading-relaxed mt-0.5 md:mt-1">
          {body}
        </p>
        {tech && (
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-[var(--color-cream-warm)] text-[var(--color-muted)] text-[11px] md:text-[12.5px] font-mono">
            {tech}
          </span>
        )}
      </div>
    </div>
  );
}

interface StackTileProps {
  index: string;
  icon: ReactNode;
  label: string;
  tech: string;
  tone?: "sage" | "sky" | "clay" | "sand";
}

const TILE_TONES: Record<
  NonNullable<StackTileProps["tone"]>,
  { bg: string; fg: string }
> = {
  sage: { bg: "var(--color-sage-soft)", fg: "var(--color-sage-deep)" },
  sky: { bg: "var(--color-sky-soft)", fg: "#3b5a73" },
  clay: { bg: "var(--color-clay-soft)", fg: "#7d4730" },
  sand: { bg: "var(--color-sand)", fg: "#6a5326" },
};

/* ------------------------------------------------------------------ */
/*  Pipeline stage card — used on the Stack overview slide of /theory  */
/* ------------------------------------------------------------------ */

interface PipelineStageProps {
  number: string;
  icon: ReactElement;
  tone: "sage" | "sky" | "clay" | "sand";
  name: string;
  tagline: string;
  bullets: string[];
  stack: string[];
}

export function PipelineStage({
  number,
  icon,
  tone,
  name,
  tagline,
  bullets,
  stack,
}: PipelineStageProps) {
  const palette = TILE_TONES[tone];
  return (
    <div className="card p-5 md:p-6 lg:p-7 flex flex-col h-full lift">
      <div className="flex items-center justify-between mb-4 md:mb-5">
        <span
          className="grid place-items-center h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-2xl shrink-0"
          style={{ background: palette.bg, color: palette.fg }}
        >
          {icon}
        </span>
        <span
          className="font-mono text-[10px] md:text-[11.5px] uppercase tracking-[0.2em] text-[var(--color-muted)]"
        >
          Pipeline {number}
        </span>
      </div>
      <p className="display text-[20px] md:text-[24px] lg:text-[26px] leading-tight mb-1.5">
        {name}
      </p>
      <p className="text-[13px] md:text-[14.5px] text-[var(--color-ink-soft)] leading-snug mb-4 md:mb-5">
        {tagline}
      </p>
      <ul className="grid gap-2 md:gap-2.5 text-[12.5px] md:text-[14px] text-[var(--color-ink-soft)] leading-relaxed mb-4 md:mb-5 flex-1">
        {bullets.map((b) => (
          <li key={b} className="pl-4 relative">
            <span
              className="absolute left-0 top-2 md:top-2.5 h-1.5 w-1.5 rounded-full"
              style={{ background: palette.fg }}
            />
            {b}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-1.5">
        {stack.map((t) => (
          <span
            key={t}
            className="text-[10.5px] md:text-[11.5px] font-mono text-[var(--color-muted)] bg-[var(--color-cream-warm)] px-2 py-0.5 rounded-full"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-[var(--color-muted)] py-1 lg:py-0 lg:px-1">
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        className="rotate-90 lg:rotate-0"
        aria-hidden
      >
        <path
          d="M 4 11 L 16 11 M 12 7 L 16 11 L 12 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export function StackTile({
  index,
  icon,
  label,
  tech,
  tone = "sage",
}: StackTileProps) {
  const palette = TILE_TONES[tone];
  return (
    <div className="card p-3.5 md:p-5 lg:p-6 flex items-start gap-3 md:gap-4">
      <span
        className="grid place-items-center h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 rounded-2xl shrink-0"
        style={{ background: palette.bg, color: palette.fg }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] md:text-[12px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium">
          {index}
        </p>
        <p className="text-[14px] md:text-[17px] lg:text-[19px] font-medium leading-tight mt-0.5">
          {label}
        </p>
        <p className="text-[11px] md:text-[12.5px] text-[var(--color-muted)] font-mono mt-1 truncate">
          {tech}
        </p>
      </div>
    </div>
  );
}

interface CodeSnippetProps {
  lang?: string;
  code: string;
}

export function CodeSnippet({ lang, code }: CodeSnippetProps) {
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--color-line)]">
      {lang && (
        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-[var(--color-cream-warm)] text-[10px] md:text-[11.5px] uppercase tracking-[0.16em] text-[var(--color-muted)] font-medium">
          {lang}
        </div>
      )}
      <pre className="bg-[#161917] text-[#d8e3d3] px-3 md:px-5 py-3 md:py-4 overflow-x-auto text-[11.5px] md:text-[13.5px] lg:text-[14px] leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ResidencyRow({
  label,
  where,
  tone,
}: {
  label: string;
  where: string;
  tone: "device" | "server" | "never";
}) {
  const cfg = {
    device: {
      bg: "var(--color-sage-soft)",
      fg: "var(--color-sage-deep)",
      pill: "On device",
    },
    server: {
      bg: "var(--color-sky-soft)",
      fg: "#3b5a73",
      pill: "Server",
    },
    never: {
      bg: "var(--color-clay-soft)",
      fg: "#7d4730",
      pill: "Never stored",
    },
  }[tone];
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 md:py-3.5 border-b border-[var(--color-line)] last:border-0">
      <div>
        <p className="text-[13.5px] md:text-[15.5px] font-medium">{label}</p>
        <p className="text-[12px] md:text-[13.5px] text-[var(--color-muted)]">
          {where}
        </p>
      </div>
      <span
        className="shrink-0 px-2.5 md:px-3.5 py-1 md:py-1.5 rounded-full text-[11px] md:text-[12.5px] font-medium"
        style={{ background: cfg.bg, color: cfg.fg }}
      >
        {cfg.pill}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Match graph — bipartite SVG showing activity → topics → users     */
/* ------------------------------------------------------------------ */

interface MatchGraphProps {
  className?: string;
}

export function MatchGraph({ className = "" }: MatchGraphProps) {
  // Layout: 360 wide × 300 tall
  // Row 1 (y=34): Activity
  // Row 2 (y=130): Topics (3)
  // Row 3 (y=240): Candidate users (4)
  const sage = "var(--color-sage)";
  const sageSoft = "var(--color-sage-soft)";
  const sageDeep = "var(--color-sage-deep)";
  const line = "var(--color-line)";
  const ink = "var(--color-ink)";
  const cream = "var(--color-paper)";

  const topics = [
    { x: 60, y: 130, label: "board games" },
    { x: 180, y: 130, label: "strategy" },
    { x: 300, y: 130, label: "casual" },
  ];

  const users = [
    { x: 50, y: 240, name: "U1", score: 1 },
    { x: 140, y: 240, name: "U2", score: 2, winner: true },
    { x: 230, y: 240, name: "U3", score: 2, winner: true },
    { x: 320, y: 240, name: "U4", score: 1 },
  ];

  // Topic → user edges. Match score per user = how many topics they like.
  const edges: Array<[number, number, boolean]> = [
    // [topicIdx, userIdx, winning]
    [0, 0, false],
    [0, 1, true],
    [1, 1, true],
    [1, 2, true],
    [2, 2, true],
    [2, 3, false],
  ];

  return (
    <svg
      viewBox="0 0 360 300"
      className={`w-full max-w-md md:max-w-xl lg:max-w-2xl mx-auto ${className}`}
      role="img"
      aria-label="Bipartite graph: activity connected to topics, topics connected to candidate users; two users score 2, two score 1."
    >
      {/* Activity → Topics */}
      {topics.map((t, i) => (
        <line
          key={`at-${i}`}
          x1="180"
          y1="48"
          x2={t.x}
          y2={t.y - 14}
          stroke={line}
          strokeWidth="1.2"
        />
      ))}

      {/* Topics → Users */}
      {edges.map(([ti, ui, win], idx) => {
        const t = topics[ti];
        const u = users[ui];
        return (
          <line
            key={`tu-${idx}`}
            x1={t.x}
            y1={t.y + 14}
            x2={u.x}
            y2={u.y - 14}
            stroke={win ? sage : line}
            strokeWidth={win ? "2" : "1.2"}
            opacity={win ? 0.9 : 0.6}
          />
        );
      })}

      {/* Activity node */}
      <g>
        <rect
          x="110"
          y="22"
          width="140"
          height="40"
          rx="20"
          fill={sage}
          stroke={sageDeep}
          strokeWidth="1"
        />
        <text
          x="180"
          y="42"
          textAnchor="middle"
          fill="white"
          fontSize="11.5"
          fontWeight="600"
          fontFamily="ui-sans-serif, system-ui"
        >
          Activity
        </text>
        <text
          x="180"
          y="55"
          textAnchor="middle"
          fill="white"
          fontSize="9.5"
          fontFamily="ui-monospace, monospace"
          opacity="0.85"
        >
          :Activity {`{title}`}
        </text>
      </g>

      {/* Topic nodes */}
      {topics.map((t, i) => (
        <g key={`topic-${i}`}>
          <rect
            x={t.x - 48}
            y={t.y - 14}
            width="96"
            height="28"
            rx="14"
            fill={sageSoft}
            stroke={sage}
            strokeWidth="1"
          />
          <text
            x={t.x}
            y={t.y + 4}
            textAnchor="middle"
            fill={sageDeep}
            fontSize="11"
            fontFamily="ui-sans-serif, system-ui"
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* User nodes */}
      {users.map((u, i) => (
        <g key={`user-${i}`}>
          <circle
            cx={u.x}
            cy={u.y}
            r="18"
            fill={u.winner ? sage : cream}
            stroke={u.winner ? sageDeep : line}
            strokeWidth={u.winner ? "1.5" : "1"}
          />
          <text
            x={u.x}
            y={u.y + 3}
            textAnchor="middle"
            fill={u.winner ? "white" : ink}
            fontSize="11"
            fontWeight="600"
            fontFamily="ui-sans-serif, system-ui"
          >
            {u.name}
          </text>
          <text
            x={u.x}
            y={u.y + 30}
            textAnchor="middle"
            fill={u.winner ? sageDeep : "var(--color-muted)"}
            fontSize="9.5"
            fontFamily="ui-monospace, monospace"
            fontWeight={u.winner ? 600 : 400}
          >
            score {u.score}
          </text>
        </g>
      ))}

      {/* Edge labels */}
      <text
        x="358"
        y="92"
        textAnchor="end"
        fontSize="9"
        fill="var(--color-muted)"
        fontFamily="ui-monospace, monospace"
      >
        :REQUIRES
      </text>
      <text
        x="358"
        y="194"
        textAnchor="end"
        fontSize="9"
        fill="var(--color-muted)"
        fontFamily="ui-monospace, monospace"
      >
        :LIKES
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Audio waveform visual — purely decorative SVG for the audio       */
/*  section header.                                                    */
/* ------------------------------------------------------------------ */

export function AudioWave({ className = "" }: { className?: string }) {
  const bars = [4, 8, 14, 22, 16, 26, 12, 20, 28, 18, 10, 22, 14, 8, 4];
  return (
    <div
      className={`flex items-center justify-center gap-[3px] md:gap-1 h-8 md:h-12 ${className}`}
      aria-hidden
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className="block w-[3px] md:w-1 rounded-full bg-[var(--color-sage)]"
          style={{
            height: `${h}px`,
            opacity: 0.45 + (h / 32) * 0.55,
          }}
        />
      ))}
    </div>
  );
}
