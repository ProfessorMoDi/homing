"use client";

import { useEffect, useMemo, useState } from "react";
import { devBus, useDevEvents, type DevEvent } from "../lib/devBus";
import { useDevMode } from "../lib/devMode";
import { Timeline } from "./devpanel/Timeline";
import { CallDetail } from "./devpanel/CallDetail";

// Top-level developer panel. Two columns: a timeline of recent API calls on
// the left, the detail view for the selected call on the right.
//
// Auto-selects the most recent event when the user hasn't picked one. This
// keeps the panel useful during a live demo — by default it follows the
// action; clicking a row pins it.

export function DevPanel() {
  const events = useDevEvents();
  const { toggle } = useDevMode();
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // If the pinned event scrolls out of the ring buffer, drop the pin.
  useEffect(() => {
    if (pinnedId && !events.some((e) => e.id === pinnedId)) {
      setPinnedId(null);
    }
  }, [events, pinnedId]);

  const selected: DevEvent | null = useMemo(() => {
    if (pinnedId) {
      return events.find((e) => e.id === pinnedId) ?? null;
    }
    return events[0] ?? null;
  }, [events, pinnedId]);

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
        <div className="dev-panel__actions">
          <button
            type="button"
            className="dev-panel__action"
            onClick={() => devBus.clear()}
            title="Clear the event ring"
          >
            Clear
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

      <div className="dev-panel__body">
        <Timeline
          events={events}
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
        Use the mobile app on the left. Every <code>/api/*</code> call will
        appear here with its full request, response, and timing.
      </p>
      <ul>
        <li>
          <span className="dev-pill dev-pill--sky">/api/transcribe</span> —
          voice → text
        </li>
        <li>
          <span className="dev-pill dev-pill--clay">/api/analyze</span> — text
          → topics + activities
        </li>
        <li>
          <span className="dev-pill dev-pill--sage">/api/neo4j/activity</span>{" "}
          — persist activity + canonicalisation deltas
        </li>
        <li>
          <span className="dev-pill dev-pill--sage">/api/neo4j/match</span> —
          weighted graph-based matching
        </li>
        <li>
          <span className="dev-pill dev-pill--sage">/api/neo4j/graph</span> —
          subgraph for visualisation
        </li>
      </ul>
    </div>
  );
}
