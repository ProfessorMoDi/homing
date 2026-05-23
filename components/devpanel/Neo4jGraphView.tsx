"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractiveNvlWrapper } from "@neo4j-nvl/react";
import type { Node as NvlNode, Relationship as NvlRel } from "@neo4j-nvl/base";
import type { DevEvent } from "../../lib/devBus";

// Interactive graph view powered by Neo4j's Visualization Library (NVL).
// Force-directed layout, pan/zoom/drag built in. Clicking a topic or user
// node fires /api/neo4j/expand to pull the next 1-hop layer and merges it
// into the live graph — the user can trace the matching logic node by node.

interface PayloadNode {
  id: string;
  label: string;
  kind: "activity" | "topic-required" | "topic-related" | "user" | "creator";
  meta?: Record<string, unknown>;
}

interface PayloadEdge {
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
  nodes?: PayloadNode[];
  edges?: PayloadEdge[];
  counts?: Record<string, number>;
}

// Palette tied to the design tokens (--color-*). NVL needs concrete hex.
const COLOR = {
  ink: "#1b1d1c",
  sage: "#4f7942",
  sageSoft: "#e0e9d6",
  clay: "#c97e63",
  sky: "#8fb3c9",
  paper: "#ffffff",
  line: "#e2dfd4",
  muted: "#8a8a85",
} as const;

const SIZE_BY_KIND: Record<PayloadNode["kind"], number> = {
  activity: 60,
  "topic-required": 42,
  "topic-related": 30,
  creator: 38,
  user: 32,
};

const COLOR_BY_KIND: Record<PayloadNode["kind"], string> = {
  activity: COLOR.ink,
  "topic-required": COLOR.sage,
  "topic-related": COLOR.sageSoft,
  creator: COLOR.clay,
  user: COLOR.sky,
};

const REL_STYLE: Record<PayloadEdge["kind"], { color: string; width: number }> = {
  REQUIRES:    { color: COLOR.ink,  width: 3 },
  RELATED_TO:  { color: COLOR.sage, width: 2 },
  LIKES:       { color: COLOR.sky,  width: 1.5 },
};

export function Neo4jGraphView({ event }: { event: DevEvent }) {
  const initial = (event.responseBody as GraphPayload | null) ?? null;
  // Local accumulator: starts with the subgraph the server returned, grows
  // as the user expands nodes. Re-seeds whenever the source event changes.
  const [nodes, setNodes] = useState<PayloadNode[]>(initial?.nodes ?? []);
  const [edges, setEdges] = useState<PayloadEdge[]>(initial?.edges ?? []);
  const [hover, setHover] = useState<PayloadNode | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const expandedRef = useRef<Set<string>>(new Set());
  const nvlRef = useRef<unknown>(null);

  useEffect(() => {
    setNodes(initial?.nodes ?? []);
    setEdges(initial?.edges ?? []);
    expandedRef.current.clear();
    setHover(null);
  }, [event.id, initial?.nodes, initial?.edges]);

  // Map payload → NVL shapes. Memo on identity so NVL doesn't re-layout on
  // every render.
  const nvlNodes: NvlNode[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        caption: n.label,
        color: COLOR_BY_KIND[n.kind],
        size: SIZE_BY_KIND[n.kind],
        captionAlign: "bottom" as const,
        captionSize: 1.1,
      })),
    [nodes],
  );

  const nvlRels: NvlRel[] = useMemo(
    () =>
      edges.map((e, i) => {
        const style = REL_STYLE[e.kind];
        return {
          id: `${e.from}__${e.to}__${e.kind}__${i}`,
          from: e.from,
          to: e.to,
          type: e.kind,
          caption:
            e.kind === "RELATED_TO" && e.weight != null
              ? e.weight.toFixed(1)
              : undefined,
          color: style.color,
          width: style.width,
          captionSize: 0.9,
        };
      }),
    [edges],
  );

  const expand = useCallback(
    async (node: PayloadNode) => {
      if (node.kind === "activity") return;
      if (expandedRef.current.has(node.id)) return;
      expandedRef.current.add(node.id);
      setBusy(node.id);
      try {
        const r = await fetch("/api/neo4j/expand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId: node.id, kind: node.kind }),
        });
        if (!r.ok) return;
        const data = (await r.json()) as {
          nodes?: PayloadNode[];
          edges?: PayloadEdge[];
        };
        if (!data.nodes && !data.edges) return;
        setNodes((prev) => mergeNodes(prev, data.nodes ?? []));
        setEdges((prev) => mergeEdges(prev, data.edges ?? []));
      } catch {
        // fail-soft: dev panel will show the failed expand in the timeline
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const mouseEventCallbacks = useMemo(
    () => ({
      onHover: (element: { id: string } | null) => {
        if (!element) {
          setHover(null);
          return;
        }
        const found = nodes.find((n) => n.id === element.id);
        if (found) setHover(found);
      },
      onNodeClick: (node: { id: string }) => {
        const found = nodes.find((n) => n.id === node.id);
        if (found) expand(found);
      },
      // Allow built-in interaction: pan, zoom, drag.
      onPan: true as unknown as undefined,
      onZoom: true as unknown as undefined,
      onDrag: true as unknown as undefined,
    }),
    [nodes, expand],
  );

  if (!initial || (initial.nodes ?? []).length === 0) {
    return (
      <div className="dev-graph dev-graph--empty">
        {event.state === "pending"
          ? "Loading subgraph…"
          : "No subgraph data on this response."}
      </div>
    );
  }

  return (
    <div className="dev-graph">
      <div className="dev-graph__meta">
        <strong>Activity subgraph</strong>
        <span className="dev-graph__counts">
          {nodes.length} nodes · {edges.length} edges
          {expandedRef.current.size > 0
            ? ` · ${expandedRef.current.size} expanded`
            : ""}
        </span>
      </div>

      <div className="dev-graph__hint">
        Drag to reposition · scroll to zoom · click a topic or user to expand its
        connections
      </div>

      <div className="dev-graph__nvl">
        <InteractiveNvlWrapper
          // @ts-expect-error — ref typing of NVL is overly strict
          ref={nvlRef}
          nodes={nvlNodes}
          rels={nvlRels}
          layout="forceDirected"
          nvlOptions={{
            initialZoom: 0.75,
            allowDynamicMinZoom: true,
            instanceId: `nvl-${event.id}`,
            relationshipThreshold: 0,
          }}
          mouseEventCallbacks={mouseEventCallbacks}
          style={{ width: "100%", height: 360, background: COLOR.paper }}
        />
        {busy ? (
          <div className="dev-graph__busy">Expanding {busy}…</div>
        ) : null}
      </div>

      <Legend />
      {hover ? <HoverDetail node={hover} /> : null}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function mergeNodes(prev: PayloadNode[], next: PayloadNode[]): PayloadNode[] {
  const seen = new Set(prev.map((n) => n.id));
  const merged = [...prev];
  for (const n of next) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    merged.push(n);
  }
  return merged;
}

function mergeEdges(prev: PayloadEdge[], next: PayloadEdge[]): PayloadEdge[] {
  const key = (e: PayloadEdge) => `${e.from}|${e.to}|${e.kind}`;
  const seen = new Set(prev.map(key));
  const merged = [...prev];
  for (const e of next) {
    if (seen.has(key(e))) continue;
    seen.add(key(e));
    merged.push(e);
  }
  return merged;
}

function HoverDetail({ node }: { node: PayloadNode }) {
  return (
    <div className="dev-graph__hover">
      <div className="dev-graph__hover-title">
        <span className={`dev-graph__hover-dot dev-graph__hover-dot--${node.kind}`} />
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
      <Item kind="creator" label="Creator" />
      <Item kind="user" label="User" />
      <div className="dev-graph__legend-divider" />
      <EdgeItem cls="requires" label="REQUIRES" />
      <EdgeItem cls="related" label="RELATED_TO" />
      <EdgeItem cls="likes" label="LIKES" />
    </div>
  );
}

function Item({ kind, label }: { kind: PayloadNode["kind"]; label: string }) {
  return (
    <div className="dev-graph__legend-item">
      <span className={`dev-graph__legend-dot dev-graph__legend-dot--${kind}`} />
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
