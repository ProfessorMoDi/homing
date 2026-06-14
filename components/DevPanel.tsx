"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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
  const { state, matches, matchSource, matchLoading } = useApp();
  const pathname = usePathname();
  const userCtx = useMemo(() => currentUserContext(state.signup), [state.signup]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [focusedStage, setFocusedStage] = useState<StageId | "auto">("auto");
  const [clearing, setClearing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [seedNote, setSeedNote] = useState<string | null>(null);

  async function clearDemo() {
    setClearing(true);
    try {
      await fetch("/api/neo4j/demo-clear", { method: "POST" });
    } catch {}
    setClearing(false);
  }

  async function seedGraph() {
    setSeeding(true);
    setSeedNote(null);
    try {
      const r = await fetch("/api/neo4j/seed", { method: "POST" });
      const data = (await r.json().catch(() => null)) as
        | { users?: number; topics?: number }
        | null;
      setSeedNote(
        r.ok && data
          ? `Seeded ${data.users ?? "?"} users · ${data.topics ?? "?"} topics`
          : "Seed failed",
      );
    } catch {
      setSeedNote("Seed failed");
    }
    setSeeding(false);
  }

  async function resetDb() {
    if (
      !window.confirm(
        "Wipe the ENTIRE Neo4j graph (all users, activities, demo + real data) and rebuild schema + ontology with no users? This cannot be undone.",
      )
    ) {
      return;
    }
    setResetting(true);
    setSeedNote(null);
    try {
      const r = await fetch("/api/neo4j/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" }),
      });
      const data = (await r.json().catch(() => null)) as
        | { nodes_deleted?: number; ontology_edges?: number }
        | null;
      setSeedNote(
        r.ok && data
          ? `Reset: wiped ${data.nodes_deleted ?? "?"} nodes · ${data.ontology_edges ?? "?"} ontology edges`
          : "Reset failed",
      );
    } catch {
      setSeedNote("Reset failed");
    }
    setResetting(false);
  }

  // On the finding screen the match is the headline. Auto-focus the match
  // stage so the panel and the mobile screen tell the same story.
  useEffect(() => {
    if (pathname === "/activity/finding") {
      setFocusedStage("match");
    }
  }, [pathname]);

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
            onClick={seedGraph}
            disabled={seeding}
            title="Run schema migration + seed the 12 EUR users and topic ontology"
          >
            {seeding ? "Seeding…" : "Seed graph"}
          </button>
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
            className="dev-panel__action dev-panel__action--danger"
            onClick={resetDb}
            disabled={resetting}
            title="DESTRUCTIVE — wipe the entire graph and rebuild schema + ontology with no users (for fresh real-data collection)"
          >
            {resetting ? "Resetting…" : "Reset DB"}
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

      <LiveState
        matchSource={matchSource}
        matchLoading={matchLoading}
        topMatches={matches.slice(0, 3)}
        seedNote={seedNote}
      />

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

function LiveState({
  matchSource,
  matchLoading,
  topMatches,
  seedNote,
}: {
  matchSource: "graph" | "mock" | "loading";
  matchLoading: boolean;
  topMatches: Array<{ user: { id: string; first_name: string }; score: number; reasons: string[] }>;
  seedNote: string | null;
}) {
  const sourceLabel = matchLoading
    ? "loading"
    : matchSource === "graph"
      ? "Neo4j graph"
      : matchSource === "mock"
        ? "local fallback"
        : matchSource;

  return (
    <div className="dev-livestate">
      <div className="dev-livestate__row">
        <span className="dev-livestate__label">App match source</span>
        <span
          className={
            "dev-livestate__source dev-livestate__source--" +
            (matchLoading ? "loading" : matchSource)
          }
        >
          {sourceLabel}
        </span>
        {seedNote ? (
          <span className="dev-livestate__note">{seedNote}</span>
        ) : null}
      </div>
      {topMatches.length > 0 ? (
        <ol className="dev-livestate__matches">
          {topMatches.map((m) => (
            <li key={m.user.id} className="dev-livestate__match">
              <span className="dev-livestate__match-name">{m.user.first_name}</span>
              <span className="dev-livestate__match-score">{m.score}</span>
              {m.reasons[0] ? (
                <span className="dev-livestate__match-reason">{m.reasons[0]}</span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="dev-livestate__hint">
          The list the mobile screen renders. It mirrors the latest{" "}
          <code>/api/neo4j/match</code> response when the graph is reachable.
        </p>
      )}
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
