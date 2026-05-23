"use client";

import { useMemo, useState } from "react";
import type { DevEvent } from "../../lib/devBus";

// Hand-rolled SVG render of an activity-scoped subgraph. Deterministic
// radial layout (no force simulation): activity in centre, required topics
// on the inner ring, RELATED_TO neighbours on a mid ring, users on the
// outer ring. Edges colour-coded by relationship type; hover surfaces
// metadata.

interface Node {
  id: string;
  label: string;
  kind: "activity" | "topic-required" | "topic-related" | "user" | "creator";
  meta?: Record<string, unknown>;
}

interface Edge {
  from: string;
  to: string;
  kind: "REQUIRES" | "RELATED_TO" | "LIKES";
  weight?: number;
  tier?: string;
  related_kind?: string;
}

interface GraphPayload {
  activity_id?: string;
  creator_user_id?: string;
  nodes?: Node[];
  edges?: Edge[];
  counts?: Record<string, number>;
}

const W = 560;
const H = 460;
const CX = W / 2;
const CY = H / 2;
const RING = { required: 100, related: 175, user: 220 };

export function Neo4jGraphView({ event }: { event: DevEvent }) {
  const data = (event.responseBody as GraphPayload | null) ?? null;
  const [hover, setHover] = useState<string | null>(null);

  const layout = useMemo(() => computeLayout(data?.nodes ?? []), [data?.nodes]);
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="dev-graph dev-graph--empty">
        {event.state === "pending"
          ? "Loading subgraph…"
          : "No subgraph data on this response."}
      </div>
    );
  }

  const positions = layout.positions;
  const edges = data.edges ?? [];

  return (
    <div className="dev-graph">
      <div className="dev-graph__meta">
        <strong>Activity subgraph</strong>
        <span className="dev-graph__counts">
          {data.counts?.nodes ?? data.nodes.length} nodes ·{" "}
          {data.counts?.edges ?? edges.length} edges
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="dev-graph__svg"
        role="img"
        aria-label="Neo4j subgraph"
      >
        {/* Ring guides */}
        <circle cx={CX} cy={CY} r={RING.required} className="dev-graph__ring" />
        <circle cx={CX} cy={CY} r={RING.related} className="dev-graph__ring" />
        <circle cx={CX} cy={CY} r={RING.user} className="dev-graph__ring" />

        {/* Edges first so nodes sit on top */}
        <g>
          {edges.map((e, i) => {
            const a = positions.get(e.from);
            const b = positions.get(e.to);
            if (!a || !b) return null;
            const highlighted =
              hover != null && (hover === e.from || hover === e.to);
            const colorClass = `dev-graph__edge--${edgeColorClass(e.kind)}`;
            const opacity = highlighted ? 1 : hover ? 0.15 : 0.6;
            return (
              <g key={i}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className={`dev-graph__edge ${colorClass}`}
                  strokeOpacity={opacity}
                />
                {e.kind === "RELATED_TO" && e.weight != null ? (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 4}
                    className="dev-graph__edge-label"
                    opacity={hover && !highlighted ? 0 : 0.7}
                  >
                    {e.weight.toFixed(1)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {data.nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            const isHover = hover === n.id;
            const r = nodeRadius(n.kind);
            return (
              <g
                key={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                className="dev-graph__node-g"
              >
                <circle
                  r={r}
                  className={`dev-graph__node dev-graph__node--${kindClass(n.kind)}`}
                  style={{
                    transform: isHover ? "scale(1.18)" : "scale(1)",
                    transformOrigin: "center",
                  }}
                />
                <text
                  y={r + 12}
                  textAnchor="middle"
                  className="dev-graph__node-label"
                >
                  {truncate(n.label, 18)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <Legend />
      {hover ? <HoverDetail node={data.nodes.find((n) => n.id === hover) ?? null} /> : null}
    </div>
  );
}

function HoverDetail({ node }: { node: Node | null }) {
  if (!node) return null;
  return (
    <div className="dev-graph__hover">
      <div className="dev-graph__hover-title">
        <span className={`dev-graph__hover-dot dev-graph__hover-dot--${kindClass(node.kind)}`} />
        <strong>{node.label}</strong>
        <code>{node.id}</code>
      </div>
      <div className="dev-graph__hover-kind">{node.kind.replace("-", " ")}</div>
      {node.meta && Object.keys(node.meta).length > 0 ? (
        <ul className="dev-graph__hover-meta">
          {Object.entries(node.meta).map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <code>{String(v)}</code>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Legend() {
  return (
    <div className="dev-graph__legend">
      <Item kind="activity" label="Activity" />
      <Item kind="topic-required" label="Required topic" />
      <Item kind="topic-related" label="Related topic" />
      <Item kind="user" label="User · :LIKES" />
      <Item kind="creator" label="Creator" />
      <div className="dev-graph__legend-divider" />
      <EdgeItem cls="requires" label="REQUIRES" />
      <EdgeItem cls="related" label="RELATED_TO" />
      <EdgeItem cls="likes" label="LIKES" />
    </div>
  );
}

function Item({ kind, label }: { kind: Node["kind"]; label: string }) {
  return (
    <div className="dev-graph__legend-item">
      <span className={`dev-graph__legend-dot dev-graph__legend-dot--${kindClass(kind)}`} />
      <span>{label}</span>
    </div>
  );
}

function EdgeItem({ cls, label }: { cls: string; label: string }) {
  return (
    <div className="dev-graph__legend-item">
      <span className={`dev-graph__legend-edge dev-graph__legend-edge--${cls}`} />
      <span>{label}</span>
    </div>
  );
}

// ── Layout ──────────────────────────────────────────────────────────────────
function computeLayout(nodes: Node[]): {
  positions: Map<string, { x: number; y: number }>;
} {
  const positions = new Map<string, { x: number; y: number }>();
  const activity = nodes.find((n) => n.kind === "activity");
  if (activity) positions.set(activity.id, { x: CX, y: CY });

  const required = nodes.filter((n) => n.kind === "topic-required");
  required.forEach((n, i) => {
    const angle = (i / Math.max(1, required.length)) * Math.PI * 2 - Math.PI / 2;
    positions.set(n.id, {
      x: CX + Math.cos(angle) * RING.required,
      y: CY + Math.sin(angle) * RING.required,
    });
  });

  const related = nodes.filter((n) => n.kind === "topic-related");
  related.forEach((n, i) => {
    const angle = (i / Math.max(1, related.length)) * Math.PI * 2 - Math.PI / 2 + Math.PI / Math.max(8, related.length * 2);
    positions.set(n.id, {
      x: CX + Math.cos(angle) * RING.related,
      y: CY + Math.sin(angle) * RING.related,
    });
  });

  const users = nodes.filter((n) => n.kind === "user" || n.kind === "creator");
  users.forEach((n, i) => {
    const angle = (i / Math.max(1, users.length)) * Math.PI * 2 - Math.PI / 2;
    positions.set(n.id, {
      x: CX + Math.cos(angle) * RING.user,
      y: CY + Math.sin(angle) * RING.user,
    });
  });

  return { positions };
}

function nodeRadius(kind: Node["kind"]): number {
  switch (kind) {
    case "activity": return 26;
    case "topic-required": return 16;
    case "topic-related": return 11;
    case "creator": return 14;
    case "user": return 12;
  }
}

function kindClass(kind: Node["kind"]): string {
  switch (kind) {
    case "activity": return "activity";
    case "topic-required": return "topic-required";
    case "topic-related": return "topic-related";
    case "creator": return "creator";
    case "user": return "user";
  }
}

function edgeColorClass(kind: Edge["kind"]): string {
  switch (kind) {
    case "REQUIRES": return "requires";
    case "RELATED_TO": return "related";
    case "LIKES": return "likes";
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
