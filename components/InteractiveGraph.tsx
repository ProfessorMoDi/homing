"use client";

/**
 * InteractiveGraph
 *
 * A presentation-grade illustration of HOMING's graph-database matching model.
 * Renders a hand-positioned graph of 25 nodes and 50 edges as inline SVG.
 *
 * What the audience can do:
 *   • Hover any node — highlights the node, its direct neighbours, and the
 *     edges between them. Everything else dims so the focus reads cleanly.
 *   • Click a node — pins the focus. Click the same node or the background
 *     to release.
 *   • Click a query button — runs one of four pre-baked Cypher-equivalent
 *     queries and lights up the exact subgraph it would return.
 *
 * Pure presentation: no external graph library, no force layout, no per-frame
 * work. Positions are hand-tuned for clarity at projector size. All transitions
 * are CSS opacity, so the browser composites everything on the GPU.
 */

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

type NodeType = "activity" | "topic" | "user" | "timeslot";
type EdgeType =
  | "REQUIRES"
  | "LIKES"
  | "AVAILABLE_AT"
  | "SCHEDULED_AT"
  | "AVOID";

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
}

const VIEW_W = 880;
const VIEW_H = 560;

const NODES: GraphNode[] = [
  // ── Activities (top row) ─────────────────────────────────────────
  { id: "A1", type: "activity", label: "Catan night", sublabel: "Thu 19:30", x: 200, y: 70 },
  { id: "A2", type: "activity", label: "Photo walk", sublabel: "Sat 14:00", x: 460, y: 70 },
  { id: "A3", type: "activity", label: "Cook together", sublabel: "Fri 18:30", x: 720, y: 70 },

  // ── Topics (middle row) ──────────────────────────────────────────
  { id: "T1", type: "topic", label: "catan", x: 100, y: 200 },
  { id: "T2", type: "topic", label: "board games", x: 230, y: 200 },
  { id: "T3", type: "topic", label: "strategy", x: 360, y: 200 },
  { id: "T4", type: "topic", label: "photography", x: 460, y: 200 },
  { id: "T5", type: "topic", label: "walks", x: 580, y: 200 },
  { id: "T6", type: "topic", label: "cooking", x: 700, y: 200 },
  { id: "T7", type: "topic", label: "Korean food", x: 820, y: 200 },

  // ── Users (bottom row of 12) ─────────────────────────────────────
  { id: "U1", type: "user", label: "Anna", x: 60, y: 380 },
  { id: "U2", type: "user", label: "Bram", x: 130, y: 380 },
  { id: "U3", type: "user", label: "Clara", x: 200, y: 380 },
  { id: "U4", type: "user", label: "Daan", x: 270, y: 380 },
  { id: "U5", type: "user", label: "Eva", x: 340, y: 380 },
  { id: "U6", type: "user", label: "Finn", x: 410, y: 380 },
  { id: "U7", type: "user", label: "Gia", x: 480, y: 380 },
  { id: "U8", type: "user", label: "Hugo", x: 550, y: 380 },
  { id: "U9", type: "user", label: "Iris", x: 620, y: 380 },
  { id: "U10", type: "user", label: "Jonas", x: 690, y: 380 },
  { id: "U11", type: "user", label: "Kira", x: 760, y: 380 },
  { id: "U12", type: "user", label: "Liam", x: 830, y: 380 },

  // ── TimeSlots (bottom) ───────────────────────────────────────────
  { id: "TS1", type: "timeslot", label: "Thursday eve", x: 200, y: 510 },
  { id: "TS2", type: "timeslot", label: "Saturday 14:00", x: 460, y: 510 },
  { id: "TS3", type: "timeslot", label: "Friday eve", x: 720, y: 510 },
];

const EDGES: GraphEdge[] = [
  // REQUIRES — activities declare what they need
  { source: "A1", target: "T1", type: "REQUIRES" },
  { source: "A1", target: "T2", type: "REQUIRES" },
  { source: "A1", target: "T3", type: "REQUIRES" },
  { source: "A2", target: "T4", type: "REQUIRES" },
  { source: "A2", target: "T5", type: "REQUIRES" },
  { source: "A3", target: "T6", type: "REQUIRES" },
  { source: "A3", target: "T7", type: "REQUIRES" },

  // SCHEDULED_AT — activity has a time
  { source: "A1", target: "TS1", type: "SCHEDULED_AT" },
  { source: "A2", target: "TS2", type: "SCHEDULED_AT" },
  { source: "A3", target: "TS3", type: "SCHEDULED_AT" },

  // LIKES — users care about topics (26 edges)
  { source: "U1", target: "T1", type: "LIKES" },
  { source: "U1", target: "T2", type: "LIKES" },
  { source: "U2", target: "T1", type: "LIKES" },
  { source: "U2", target: "T2", type: "LIKES" },
  { source: "U2", target: "T3", type: "LIKES" },
  { source: "U3", target: "T1", type: "LIKES" },
  { source: "U3", target: "T3", type: "LIKES" },
  { source: "U4", target: "T4", type: "LIKES" },
  { source: "U4", target: "T5", type: "LIKES" },
  { source: "U5", target: "T4", type: "LIKES" },
  { source: "U6", target: "T6", type: "LIKES" },
  { source: "U6", target: "T7", type: "LIKES" },
  { source: "U7", target: "T2", type: "LIKES" },
  { source: "U7", target: "T6", type: "LIKES" },
  { source: "U8", target: "T2", type: "LIKES" },
  { source: "U8", target: "T6", type: "LIKES" },
  { source: "U9", target: "T3", type: "LIKES" },
  { source: "U9", target: "T5", type: "LIKES" },
  { source: "U10", target: "T6", type: "LIKES" },
  { source: "U10", target: "T7", type: "LIKES" },
  { source: "U11", target: "T1", type: "LIKES" },
  { source: "U11", target: "T2", type: "LIKES" },
  { source: "U11", target: "T3", type: "LIKES" },
  { source: "U12", target: "T5", type: "LIKES" },
  { source: "U12", target: "T6", type: "LIKES" },
  { source: "U12", target: "T7", type: "LIKES" },

  // AVAILABLE_AT — users tell us when they're free (13 edges)
  { source: "U1", target: "TS1", type: "AVAILABLE_AT" },
  { source: "U2", target: "TS1", type: "AVAILABLE_AT" },
  { source: "U3", target: "TS1", type: "AVAILABLE_AT" },
  { source: "U4", target: "TS2", type: "AVAILABLE_AT" },
  { source: "U5", target: "TS2", type: "AVAILABLE_AT" },
  { source: "U6", target: "TS3", type: "AVAILABLE_AT" },
  { source: "U7", target: "TS3", type: "AVAILABLE_AT" },
  { source: "U8", target: "TS1", type: "AVAILABLE_AT" },
  { source: "U8", target: "TS3", type: "AVAILABLE_AT" },
  { source: "U9", target: "TS2", type: "AVAILABLE_AT" },
  { source: "U10", target: "TS3", type: "AVAILABLE_AT" },
  { source: "U11", target: "TS1", type: "AVAILABLE_AT" },
  { source: "U12", target: "TS2", type: "AVAILABLE_AT" },

  // AVOID — private user-user edge, filters but never reveals
  { source: "U2", target: "U9", type: "AVOID" },
];

interface Query {
  id: string;
  label: string;
  description: string;
  nodeIds: Set<string>;
}

const QUERIES: Query[] = [
  {
    id: "catan",
    label: "Match for Catan night",
    description:
      "A1 → :REQUIRES → topics → :LIKES⁻¹ → users with :AVAILABLE_AT Thursday",
    nodeIds: new Set([
      "A1",
      "T1",
      "T2",
      "T3",
      "TS1",
      "U1",
      "U2",
      "U3",
      "U8",
      "U11",
    ]),
  },
  {
    id: "photo",
    label: "Match for Photo walk",
    description:
      "A2 → :REQUIRES → topics → :LIKES⁻¹ → users with :AVAILABLE_AT Saturday",
    nodeIds: new Set(["A2", "T4", "T5", "TS2", "U4", "U5", "U9", "U12"]),
  },
  {
    id: "cook",
    label: "Match for Cook together",
    description:
      "A3 → :REQUIRES → topics → :LIKES⁻¹ → users with :AVAILABLE_AT Friday",
    nodeIds: new Set(["A3", "T6", "T7", "TS3", "U6", "U7", "U8", "U10", "U12"]),
  },
  {
    id: "avoid",
    label: ":AVOID pair",
    description:
      "Private user-user edge that filters matches but never surfaces to either side",
    nodeIds: new Set(["U2", "U9"]),
  },
];

// Pre-compute adjacency for fast neighbour lookup.
const ADJACENCY = (() => {
  const map = new Map<string, Set<string>>();
  for (const n of NODES) map.set(n.id, new Set());
  for (const e of EDGES) {
    map.get(e.source)!.add(e.target);
    map.get(e.target)!.add(e.source);
  }
  return map;
})();

const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));

const EDGE_STYLE: Record<EdgeType, { stroke: string; width: number; dash?: string }> = {
  REQUIRES:     { stroke: "#4f7942", width: 1.8 },
  LIKES:        { stroke: "#8a8a85", width: 1.1 },
  AVAILABLE_AT: { stroke: "#b8975f", width: 1.1, dash: "3 4" },
  SCHEDULED_AT: { stroke: "#3b5a73", width: 1.4, dash: "5 4" },
  AVOID:        { stroke: "#c97e63", width: 1.6, dash: "2 3" },
};

const NODE_PALETTE: Record<NodeType, { fill: string; stroke: string; text: string }> = {
  activity: { fill: "#4f7942", stroke: "#2f4926", text: "#ffffff" },
  topic:    { fill: "#e0e9d6", stroke: "#4f7942", text: "#2f4926" },
  user:     { fill: "#ffffff", stroke: "#8fb3c9", text: "#1b1d1c" },
  timeslot: { fill: "#ead9bf", stroke: "#b8975f", text: "#6a5326" },
};

export function InteractiveGraph({ className = "" }: { className?: string }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  // The focused set is one of:
  //   - explicit query result (highest priority)
  //   - pinned node + neighbours
  //   - hovered node + neighbours
  //   - null (everything visible)
  const focusSet = useMemo<Set<string> | null>(() => {
    if (activeQuery) {
      return QUERIES.find((q) => q.id === activeQuery)?.nodeIds ?? null;
    }
    const id = pinnedId ?? hoveredId;
    if (!id) return null;
    const set = new Set<string>([id]);
    for (const neighbour of ADJACENCY.get(id) ?? []) set.add(neighbour);
    return set;
  }, [hoveredId, pinnedId, activeQuery]);

  const focusedNode = pinnedId
    ? NODE_BY_ID.get(pinnedId)
    : hoveredId
      ? NODE_BY_ID.get(hoveredId)
      : null;

  function isNodeFocused(id: string): boolean {
    return !focusSet || focusSet.has(id);
  }

  function isEdgeFocused(e: GraphEdge): boolean {
    return !focusSet || (focusSet.has(e.source) && focusSet.has(e.target));
  }

  function handleNodeClick(id: string) {
    setActiveQuery(null);
    setPinnedId((current) => (current === id ? null : id));
  }

  function reset() {
    setHoveredId(null);
    setPinnedId(null);
    setActiveQuery(null);
  }

  return (
    <div className={className}>
      {/* Query controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3 md:mb-4">
        {QUERIES.map((q) => {
          const active = activeQuery === q.id;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setPinnedId(null);
                setActiveQuery((cur) => (cur === q.id ? null : q.id));
              }}
              className={
                "text-[11.5px] md:text-[13px] font-medium px-3 py-1.5 md:py-2 rounded-full transition-colors tap " +
                (active
                  ? "bg-[var(--color-sage)] text-white"
                  : "bg-white border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-cream-warm)]")
              }
            >
              {q.label}
            </button>
          );
        })}
        {(activeQuery || pinnedId) && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] md:text-[13px] text-[var(--color-muted)] hover:text-[var(--color-ink-soft)] tap"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        )}
      </div>

      {/* Graph canvas */}
      <div
        className="relative rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] overflow-x-auto overflow-y-hidden"
        onClick={(e) => {
          // Click on the background (not on a node) clears the pin.
          if (e.target === e.currentTarget) {
            setPinnedId(null);
            setActiveQuery(null);
          }
        }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block w-full min-w-[760px] h-auto"
          role="img"
          aria-label="Interactive graph showing activities, topics, users, and time slots."
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPinnedId(null);
              setActiveQuery(null);
            }
          }}
        >
          {/* Edges first, so node shapes sit on top */}
          <g>
            {EDGES.map((edge, i) => {
              const a = NODE_BY_ID.get(edge.source)!;
              const b = NODE_BY_ID.get(edge.target)!;
              const style = EDGE_STYLE[edge.type];
              const focused = isEdgeFocused(edge);
              return (
                <line
                  key={`e-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={style.stroke}
                  strokeWidth={focused ? style.width + 0.6 : style.width}
                  strokeDasharray={style.dash}
                  style={{
                    opacity: focused ? 0.9 : 0.08,
                    transition: "opacity 220ms ease-out, stroke-width 220ms ease-out",
                  }}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {NODES.map((n) => {
              const focused = isNodeFocused(n.id);
              const palette = NODE_PALETTE[n.type];
              const isPinned = pinnedId === n.id;

              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(n.id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(n.id);
                  }}
                  tabIndex={0}
                  className="cursor-pointer outline-none"
                  style={{
                    opacity: focused ? 1 : 0.18,
                    transition: "opacity 220ms ease-out",
                  }}
                >
                  {renderNodeShape(n, palette, isPinned)}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Caption / instruction */}
      <p className="text-[11.5px] md:text-[12.5px] text-[var(--color-muted)] mt-2.5 italic">
        Hover any node, click to pin, or pick a query. Real graph queries
        animate the same way under the hood — they walk these edges.
      </p>

      {/* Info strip + legend in two columns on lg */}
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4 md:gap-5 mt-5">
        <InfoPanel node={focusedNode ?? null} query={activeQuery} />
        <Legend />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Node rendering — different shape per node type                     */
/* ------------------------------------------------------------------ */

function renderNodeShape(
  n: GraphNode,
  palette: { fill: string; stroke: string; text: string },
  pinned: boolean,
) {
  const strokeW = pinned ? 2.2 : 1.2;
  const pinHalo = pinned ? (
    <circle
      cx={n.x}
      cy={n.y}
      r={n.type === "user" ? 26 : 38}
      fill="none"
      stroke="#4f7942"
      strokeWidth="1.5"
      strokeDasharray="2 3"
      opacity={0.5}
    />
  ) : null;

  if (n.type === "activity") {
    const w = 150;
    const h = 50;
    return (
      <>
        {pinHalo}
        <rect
          x={n.x - w / 2}
          y={n.y - h / 2}
          width={w}
          height={h}
          rx={14}
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth={strokeW}
        />
        <text
          x={n.x}
          y={n.y - 4}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill={palette.text}
          fontFamily="ui-sans-serif, system-ui"
        >
          {n.label}
        </text>
        {n.sublabel && (
          <text
            x={n.x}
            y={n.y + 12}
            textAnchor="middle"
            fontSize="10"
            fill={palette.text}
            opacity={0.85}
            fontFamily="ui-monospace, monospace"
          >
            {n.sublabel}
          </text>
        )}
      </>
    );
  }

  if (n.type === "topic") {
    const w = 108;
    const h = 30;
    return (
      <>
        {pinHalo}
        <rect
          x={n.x - w / 2}
          y={n.y - h / 2}
          width={w}
          height={h}
          rx={15}
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth={strokeW}
        />
        <text
          x={n.x}
          y={n.y + 4}
          textAnchor="middle"
          fontSize="11.5"
          fill={palette.text}
          fontFamily="ui-sans-serif, system-ui"
        >
          {n.label}
        </text>
      </>
    );
  }

  if (n.type === "user") {
    return (
      <>
        {pinHalo}
        <circle
          cx={n.x}
          cy={n.y}
          r={18}
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth={strokeW}
        />
        <text
          x={n.x}
          y={n.y + 4}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={palette.text}
          fontFamily="ui-sans-serif, system-ui"
        >
          {n.label.charAt(0)}
        </text>
        <text
          x={n.x}
          y={n.y + 32}
          textAnchor="middle"
          fontSize="9.5"
          fill="#8a8a85"
          fontFamily="ui-sans-serif, system-ui"
        >
          {n.label}
        </text>
      </>
    );
  }

  // timeslot — hex-ish rect
  const w = 122;
  const h = 32;
  return (
    <>
      {pinHalo}
      <rect
        x={n.x - w / 2}
        y={n.y - h / 2}
        width={w}
        height={h}
        rx={8}
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth={strokeW}
      />
      <text
        x={n.x}
        y={n.y + 4.5}
        textAnchor="middle"
        fontSize="11.5"
        fill={palette.text}
        fontWeight="500"
        fontFamily="ui-sans-serif, system-ui"
      >
        {n.label}
      </text>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Info panel — shows details of the focused node or active query     */
/* ------------------------------------------------------------------ */

function InfoPanel({
  node,
  query,
}: {
  node: GraphNode | null;
  query: string | null;
}) {
  if (query) {
    const q = QUERIES.find((x) => x.id === query);
    if (!q) return null;
    return (
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 md:p-5">
        <p className="text-[10.5px] md:text-[12px] uppercase tracking-[0.18em] text-[var(--color-sage-deep)] font-medium mb-1.5">
          Query · {q.id}
        </p>
        <p className="text-[14px] md:text-[16px] font-medium mb-1.5">
          {q.label}
        </p>
        <p className="text-[12.5px] md:text-[14px] text-[var(--color-ink-soft)] leading-relaxed mb-2.5">
          {q.description}
        </p>
        <p className="text-[11.5px] md:text-[13px] text-[var(--color-muted)] font-mono">
          {q.nodeIds.size} nodes in result
        </p>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-line)] bg-transparent p-4 md:p-5 text-[12.5px] md:text-[14px] text-[var(--color-muted)] leading-relaxed">
        Hover or click a node to inspect its edges. The graph here has
        25 nodes and 50 edges — pick any one to see who it knows.
      </div>
    );
  }

  const degree = ADJACENCY.get(node.id)?.size ?? 0;
  const edgeBreakdown: Record<EdgeType, number> = {
    REQUIRES: 0,
    LIKES: 0,
    AVAILABLE_AT: 0,
    SCHEDULED_AT: 0,
    AVOID: 0,
  };
  for (const e of EDGES) {
    if (e.source === node.id || e.target === node.id) {
      edgeBreakdown[e.type] += 1;
    }
  }

  const typeLabel: Record<NodeType, string> = {
    activity: "Activity",
    topic: "Topic",
    user: "User",
    timeslot: "TimeSlot",
  };

  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 md:p-5">
      <p className="text-[10.5px] md:text-[12px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium mb-1.5 font-mono">
        :{typeLabel[node.type]} · {node.id}
      </p>
      <p className="text-[14px] md:text-[16px] font-medium mb-0.5">
        {node.label}
      </p>
      {node.sublabel && (
        <p className="text-[12.5px] md:text-[14px] text-[var(--color-ink-soft)] mb-2.5">
          {node.sublabel}
        </p>
      )}
      <p className="text-[12px] md:text-[13.5px] text-[var(--color-muted)] mb-2.5">
        {degree} edge{degree === 1 ? "" : "s"} connected
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(edgeBreakdown) as [EdgeType, number][])
          .filter(([, count]) => count > 0)
          .map(([type, count]) => (
            <span
              key={type}
              className="text-[10.5px] md:text-[11.5px] font-mono text-[var(--color-muted)] bg-[var(--color-cream-warm)] px-2 py-0.5 rounded-full"
            >
              :{type} × {count}
            </span>
          ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Legend — node types and edge meanings                              */
/* ------------------------------------------------------------------ */

function Legend() {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 md:p-5">
      <p className="text-[10.5px] md:text-[12px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-medium mb-3">
        Legend
      </p>
      <div className="grid grid-cols-2 gap-2.5 mb-3 text-[12px] md:text-[13.5px]">
        <LegendNode kind="activity" label="Activity" />
        <LegendNode kind="topic" label="Topic" />
        <LegendNode kind="user" label="User" />
        <LegendNode kind="timeslot" label="TimeSlot" />
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-[11.5px] md:text-[13px]">
        <LegendEdge type="REQUIRES" label=":REQUIRES — activity → topic" />
        <LegendEdge type="LIKES" label=":LIKES — user → topic" />
        <LegendEdge type="AVAILABLE_AT" label=":AVAILABLE_AT — user → time" />
        <LegendEdge type="SCHEDULED_AT" label=":SCHEDULED_AT — activity → time" />
        <LegendEdge type="AVOID" label=":AVOID — private user ↔ user" />
      </div>
    </div>
  );
}

function LegendNode({ kind, label }: { kind: NodeType; label: string }) {
  const p = NODE_PALETTE[kind];
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="inline-block h-3.5 w-6 rounded-full shrink-0"
        style={{ background: p.fill, border: `1.5px solid ${p.stroke}` }}
      />
      <span className="text-[var(--color-ink-soft)]">{label}</span>
    </div>
  );
}

function LegendEdge({ type, label }: { type: EdgeType; label: string }) {
  const s = EDGE_STYLE[type];
  return (
    <div className="inline-flex items-center gap-2">
      <svg width="28" height="6" className="shrink-0">
        <line
          x1="0"
          y1="3"
          x2="28"
          y2="3"
          stroke={s.stroke}
          strokeWidth={s.width + 0.6}
          strokeDasharray={s.dash}
        />
      </svg>
      <span className="text-[var(--color-ink-soft)] font-mono text-[11.5px]">
        {label}
      </span>
    </div>
  );
}
