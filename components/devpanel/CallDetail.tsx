"use client";

import { useState } from "react";
import type { DevEvent } from "../../lib/devBus";
import { JsonView } from "./JsonView";
import { Neo4jGraphView } from "./Neo4jGraphView";
import { MatchBreakdown } from "./MatchBreakdown";
import { CanonicalisationTrace } from "./CanonicalisationTrace";
import { stageById, stageForUrl } from "./pipeline";

// Routes a selected event to the right detail view based on the URL
// pattern. Every event always gets the JSON Request / Response viewers; the
// specialised visualisations (graph, score breakdown, canonicalisation
// trace) layer on top for the endpoints they apply to.

type Tab = "summary" | "request" | "response";

export function CallDetail({ event }: { event: DevEvent }) {
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <div className="dev-detail">
      <DetailHeader event={event} />

      <nav className="dev-detail__tabs">
        <TabButton current={tab} setCurrent={setTab} value="summary">
          Summary
        </TabButton>
        <TabButton current={tab} setCurrent={setTab} value="request">
          Request
        </TabButton>
        <TabButton current={tab} setCurrent={setTab} value="response">
          Response
        </TabButton>
      </nav>

      {tab === "summary" ? <SummaryView event={event} /> : null}
      {tab === "request" ? <RequestView event={event} /> : null}
      {tab === "response" ? <ResponseView event={event} /> : null}
    </div>
  );
}

function DetailHeader({ event }: { event: DevEvent }) {
  const isError = event.state === "error" || (event.status != null && event.status >= 400);
  return (
    <header className="dev-detail__header">
      <div className="dev-detail__line">
        <span className="dev-detail__method">{event.method}</span>
        <span className="dev-detail__path">{event.url}</span>
      </div>
      <div className="dev-detail__meta">
        <span
          className={
            "dev-detail__status" + (isError ? " is-error" : " is-ok")
          }
        >
          {event.state === "pending"
            ? "pending"
            : event.state === "error"
              ? "error"
              : event.status}
        </span>
        {event.ms != null ? (
          <span className="dev-detail__ms">{event.ms} ms</span>
        ) : null}
        <span className="dev-detail__time">
          {new Date(event.startedAt).toLocaleTimeString(undefined, {
            hour12: false,
          })}
        </span>
      </div>
    </header>
  );
}

function TabButton({
  current,
  setCurrent,
  value,
  children,
}: {
  current: Tab;
  setCurrent: (t: Tab) => void;
  value: Tab;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={
        "dev-detail__tab" + (current === value ? " is-current" : "")
      }
      onClick={() => setCurrent(value)}
    >
      {children}
    </button>
  );
}

function SummaryView({ event }: { event: DevEvent }) {
  const stage = stageById(stageForUrl(event.url));
  return (
    <div className="dev-detail__body dev-detail__body--summary">
      {/* Pipeline context first — orients the viewer before showing data */}
      <Section label={`Step · ${stage.name}`}>
        <p className="dev-detail__what">{stage.what}</p>
        {stage.steps.length > 0 ? (
          <ol className="dev-detail__steps">
            {stage.steps.map((s, i) => (
              <li key={i}>
                <span className="dev-detail__step-num">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </Section>

      {/* Endpoint-specific visualisations */}
      {event.url.startsWith("/api/neo4j/match") ? (
        <MatchBreakdown event={event} />
      ) : null}
      {event.url.startsWith("/api/neo4j/activity") ? (
        <CanonicalisationTrace event={event} />
      ) : null}
      {event.url.startsWith("/api/neo4j/graph") ? (
        <Neo4jGraphView event={event} />
      ) : null}

      <Section label="Endpoint">
        <div className="dev-detail__endpoint">
          <code>{event.method}</code> <code>{event.url}</code>
        </div>
      </Section>

      {event.error ? (
        <Section label="Error">
          <pre className="dev-detail__error">{event.error}</pre>
        </Section>
      ) : null}
    </div>
  );
}

function RequestView({ event }: { event: DevEvent }) {
  return (
    <div className="dev-detail__body">
      {event.requestHeaders && Object.keys(event.requestHeaders).length > 0 ? (
        <Section label="Headers">
          <JsonView value={event.requestHeaders} rootLabel="headers" />
        </Section>
      ) : null}
      <Section label="Body">
        {event.requestBody == null ? (
          <p className="dev-detail__muted">No request body.</p>
        ) : (
          <JsonView value={event.requestBody} rootLabel="body" />
        )}
      </Section>
    </div>
  );
}

function ResponseView({ event }: { event: DevEvent }) {
  return (
    <div className="dev-detail__body">
      <Section label="Body">
        {event.responseBody == null ? (
          <p className="dev-detail__muted">
            {event.state === "pending"
              ? "Awaiting response…"
              : event.state === "error"
                ? "Request failed before a response was received."
                : "No response body."}
          </p>
        ) : (
          <JsonView value={event.responseBody} rootLabel="body" />
        )}
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="dev-detail__section">
      <h4 className="dev-detail__section-label">{label}</h4>
      {children}
    </section>
  );
}

