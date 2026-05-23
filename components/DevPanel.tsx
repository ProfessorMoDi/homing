"use client";

import { useEffect, useMemo, useState } from "react";
import { devBus, useDevEvents, type DevEvent } from "../lib/devBus";
import { useDevMode } from "../lib/devMode";
import { useApp } from "../lib/store";
import { currentUserContext } from "../lib/currentUser";
import { Timeline } from "./devpanel/Timeline";
import { CallDetail } from "./devpanel/CallDetail";
import { PipelineNarrative } from "./devpanel/PipelineNarrative";
import { stageForUrl, type StageId } from "./devpanel/pipeline";

// Top-level developer panel.
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │  Pipeline narrative (clickable stages + step explanations)   │
//   ├────────────────────────────┬─────────────────────────────────┤
//   │  Timeline (per stage)      │  Detail (story + visualisation) │
//   └────────────────────────────┴─────────────────────────────────┘
//
// The narrative is the spine. Clicking a stage filters the timeline; the
// detail view explains the call in pipeline terms then renders the
// specialised visualisations (graph / breakdown / canonicalisation trace).
// Auto-follow: if the user hasn't pinned anything, the panel tracks the
// latest event so the demo "drives itself".

export function DevPanel() {
  const events = useDevEvents();
  const { toggle } = useDevMode();
  const { state } = useApp();
  const userCtx = useMemo(() => currentUserContext(state.signup), [state.signup]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [focusedStage, setFocusedStage] = useState<StageId | "auto">("auto");
  const [clearing, setClearing] = useState(false);

  async function clearDemo() {
    setClearing(true);
    try {
      await fetch("/api/neo4j/demo-clear", { method: "POST" });
    } catch {}
    setClearing(false);
  }

  // Drop a stale pin if its event scrolled out of the ring.
  useEffect(() => {
    if (pinnedId && !events.some((e) => e.id === pinnedId)) {
      setPinnedId(null);
    }
  }, [events, pinnedId]);

  const selected: DevEvent | null = useMemo(() => {
    if (pinnedId) return events.find((e) => e.id === pinnedId) ?? null;
    if (focusedStage !== "auto") {
      return events.find((e) => stageForUrl(e.url) === focusedStage) ?? null;
    }
    return events[0] ?? null;
  }, [events, pinnedId, focusedStage]);

  const filteredEvents = useMemo(() => {
    if (focusedStage === "auto") return events;
    return events.filter((e) => stageForUrl(e.url) === focusedStage);
  }, [events, focusedStage]);

  return (
    <div className="dev-panel">
      <header className="dev-panel__header">
        <div className="dev-panel__title">
          <span className="dev-panel__title-dot" />
          <span>Developer overview</span>
          <span className="dev-panel__title-sub">
            live API trace · {events.length}/100
          </span>
        </div>
        <div className="dev-panel__mode">
          <span
            className={`dev-panel__mode-badge ${
              userCtx.demo
                ? "dev-panel__mode-badge--demo"
                : "dev-panel__mode-badge--live"
            }`}
            title={
              userCtx.demo
                ? "Demo mode — all writes tagged demo:true and isolated under u_demo"
                : `Live mode — writes go under ${userCtx.id}`
            }
          >
            {userCtx.demo ? "DEMO" : "LIVE"}
          </span>
          <code className="dev-panel__mode-id">{userCtx.id}</code>
        </div>
        <div className="dev-panel__actions">
          <button
            type="button"
            className="dev-panel__action"
            onClick={clearDemo}
            disabled={clearing}
            title="Wipe every node and edge tagged demo:true from Neo4j"
          >
            {clearing ? "Clearing…" : "Clear demo data"}
          </button>
          <button
            type="button"
            className="dev-panel__action"
            onClick={() => devBus.clear()}
            title="Clear the event ring"
          >
            Clear log
          </button>
          <button
            type="button"
            className="dev-panel__action"
            onClick={toggle}
            title="Close (⌘\\)"
          >
            Close
          </button>
        </div>
      </header>

      <PipelineNarrative
        events={events}
        focusedStage={focusedStage}
        onFocusStage={setFocusedStage}
        selectedUrl={selected?.url ?? null}
      />

      <div className="dev-panel__body">
        <Timeline
          events={filteredEvents}
          selectedId={selected?.id ?? null}
          pinnedId={pinnedId}
          onSelect={(id) => setPinnedId((prev) => (prev === id ? null : id))}
        />
        <div className="dev-panel__detail">
          {selected ? (
            <CallDetail event={selected} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="dev-panel__empty">
      <h3>Waiting for traffic</h3>
      <p>
        Use the mobile app on the left. As each pipeline stage fires, the
        narrative above lights up and the timeline fills with the underlying
        calls. Click any stage to filter; click any row to pin its detail.
      </p>
    </div>
  );
}
