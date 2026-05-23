"use client";

import type { DevEvent } from "../../lib/devBus";

// Shows the raw → canonical transformations the activity upsert performed.
// This is the visible proof of Layer 1: the LLM emits messy "board game"
// (singular), we collapse it to "board-games" before storing.

interface TopicDelta {
  raw: string;
  tier: "specific" | "broader";
  id: string;
  title: string;
  canonical: boolean;
}

interface Payload {
  ok?: boolean;
  canonicalised?: {
    topics?: TopicDelta[];
    neighbourhood?: { raw: string; canonical: string };
  };
}

export function CanonicalisationTrace({ event }: { event: DevEvent }) {
  const data = (event.responseBody as Payload | null) ?? null;
  const canon = data?.canonicalised;

  if (!canon) {
    return (
      <div className="dev-canon dev-canon--empty">
        {event.state === "pending"
          ? "Awaiting upsert response…"
          : "This response didn't include canonicalisation info."}
      </div>
    );
  }

  const topics = canon.topics ?? [];
  const nh = canon.neighbourhood;
  const hasTopicChanges = topics.some((t) => t.raw.toLowerCase() !== t.id);
  const hasNhChange = nh && nh.raw.trim().toLowerCase() !== nh.canonical.toLowerCase();

  return (
    <div className="dev-canon">
      <div className="dev-canon__title">
        <strong>Canonicalisation</strong>
        <span className="dev-canon__hint">
          raw input → canonical id used in the graph
        </span>
      </div>

      {topics.length > 0 ? (
        <ul className="dev-canon__list">
          {topics.map((t, i) => {
            const changed = t.raw.toLowerCase() !== t.id;
            return (
              <li
                key={`${t.raw}-${i}`}
                className={
                  "dev-canon__row" +
                  (changed ? " is-changed" : " is-unchanged") +
                  (t.canonical ? " is-canonical" : " is-unknown")
                }
              >
                <span className="dev-canon__raw">{t.raw}</span>
                <span className="dev-canon__arrow">→</span>
                <span className="dev-canon__canonical">
                  <code>{t.id}</code>
                  <span className="dev-canon__title-out">{t.title}</span>
                </span>
                <span className={`dev-canon__tag dev-canon__tag--${t.tier}`}>
                  {t.tier}
                </span>
                {!t.canonical ? (
                  <span className="dev-canon__tag dev-canon__tag--unknown" title="Not in the canonical taxonomy — node created without ontology edges">
                    unknown
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="dev-canon__muted">No topics on this activity.</p>
      )}

      {nh ? (
        <div className="dev-canon__nh">
          <span className="dev-canon__nh-label">Neighbourhood</span>
          <span className={"dev-canon__row" + (hasNhChange ? " is-changed" : " is-unchanged")}>
            <span className="dev-canon__raw">{nh.raw || "—"}</span>
            <span className="dev-canon__arrow">→</span>
            <span className="dev-canon__canonical">
              <code>{nh.canonical}</code>
            </span>
          </span>
        </div>
      ) : null}

      {!hasTopicChanges && !hasNhChange ? (
        <p className="dev-canon__none">
          Nothing was rewritten — every input was already canonical.
        </p>
      ) : null}
    </div>
  );
}
