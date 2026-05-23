"use client";

import type { DevEvent } from "../../lib/devBus";

// Per-candidate score breakdown for /api/neo4j/match. Reads the response
// shape the match endpoint returns: candidates[].breakdown is six axes,
// candidates[].reasons is the human-readable "Likes X (related to Y)"
// strings derived from the graph path that won.

interface MatchCandidate {
  user_id: string;
  first_name: string;
  neighbourhood?: string;
  score: number;
  breakdown?: {
    interest: number;
    availability: number;
    language: number;
    commitment: number;
    location: number;
    preference: number;
  };
  paths?: Array<{
    req_id: string;
    req_title: string;
    via_id: string;
    via_title: string;
    weight: number;
    tier: "specific" | "broader";
  }>;
  reasons?: string[];
}

interface MatchPayload {
  candidates?: MatchCandidate[];
  error?: string;
}

const AXES: Array<{
  key: keyof NonNullable<MatchCandidate["breakdown"]>;
  label: string;
  max: number;
  color: string;
}> = [
  { key: "interest",     label: "Interest",     max: 100, color: "sage"  },
  { key: "availability", label: "Availability", max:  25, color: "sky"   },
  { key: "language",     label: "Language",     max:  15, color: "clay"  },
  { key: "commitment",   label: "Commitment",   max:   6, color: "sand"  },
  { key: "location",     label: "Location",     max:   4, color: "ink"   },
  { key: "preference",   label: "Preference",   max:  10, color: "sage"  },
];

export function MatchBreakdown({ event }: { event: DevEvent }) {
  const data = (event.responseBody as MatchPayload | null) ?? null;
  if (!data || !Array.isArray(data.candidates)) {
    return (
      <div className="dev-match dev-match--empty">
        {event.state === "pending"
          ? "Awaiting match results…"
          : data?.error
            ? `Match failed: ${data.error}`
            : "No candidates returned."}
      </div>
    );
  }

  if (data.candidates.length === 0) {
    return (
      <div className="dev-match dev-match--empty">
        No candidates matched. Either no user has overlapping interests, every
        candidate dislikes a required topic, or AVOID edges excluded them all.
      </div>
    );
  }

  return (
    <div className="dev-match">
      <div className="dev-match__title">
        <strong>Match results</strong>
        <span className="dev-match__count">
          {data.candidates.length} candidate{data.candidates.length === 1 ? "" : "s"}
        </span>
      </div>
      <details className="dev-match__algo">
        <summary>How the score is computed</summary>
        <ol>
          <li>
            <strong>Find candidates.</strong> Cypher traverses{" "}
            <code>{"(a:Activity)-[:REQUIRES]->(t:Topic)-[:RELATED_TO*0..1]-(t2:Topic)<-[:LIKES]-(u:User)"}</code>.
            So a user matches either because they directly like a required
            topic, or because they like a 1-hop neighbour in the ontology.
          </li>
          <li>
            <strong>Weight the path.</strong> A direct LIKES match gets
            weight <code>1.0</code>. A 1-hop hit uses the ontology edge
            weight: <code>0.6</code> broader · <code>0.5</code> sibling ·{" "}
            <code>0.3</code> adjacent. Per (user, requirement) we keep only
            the strongest path so direct + indirect matches never double-count.
          </li>
          <li>
            <strong>Interest score.</strong> Sum over the user's required
            topics: <code>50 × weight</code> for a specific-tier requirement,{" "}
            <code>30 × weight</code> for a broader-tier requirement.
          </li>
          <li>
            <strong>Side bonuses.</strong> Add per-axis points: availability
            (+25 thursday-evening / +22 weekend or friday-morning / +18
            weekday-evenings / +10 flexible / −15 none), language match (+15
            or −10), commitment-appetite (+6 if try-once or maybe-weekly),
            location (+4 if neighbourhood = activity.location_area), prior
            preference (+10 if the creator PREFERS_PERSON this user).
          </li>
          <li>
            <strong>Hard exclusions.</strong> A user who DISLIKES any
            specific-tier required topic is dropped. So is anyone with an
            AVOID edge in either direction with the creator.
          </li>
        </ol>
      </details>
      <ul className="dev-match__list">
        {data.candidates.map((c) => (
          <li key={c.user_id} className="dev-match__candidate">
            <header className="dev-match__candidate-head">
              <div>
                <strong className="dev-match__name">{c.first_name}</strong>
                <code className="dev-match__id">{c.user_id}</code>
                {c.neighbourhood ? (
                  <span className="dev-match__neighbourhood">
                    {c.neighbourhood}
                  </span>
                ) : null}
              </div>
              <div className="dev-match__score">
                <span className="dev-match__score-value">{c.score}</span>
                <span className="dev-match__score-label">total</span>
              </div>
            </header>

            {c.breakdown ? (
              <div className="dev-match__bars">
                {AXES.map((axis) => {
                  const v = c.breakdown![axis.key];
                  const pct = Math.max(0, Math.min(100, (v / axis.max) * 100));
                  const neg = v < 0;
                  return (
                    <div key={axis.key} className="dev-match__bar-row">
                      <span className="dev-match__bar-label">{axis.label}</span>
                      <span className="dev-match__bar-track">
                        <span
                          className={`dev-match__bar-fill dev-match__bar-fill--${axis.color}${neg ? " is-neg" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="dev-match__bar-value">
                        {v > 0 ? `+${v}` : v}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {c.paths && c.paths.length > 0 ? (
              <div className="dev-match__paths">
                <span className="dev-match__paths-label">Graph paths</span>
                <ul>
                  {c.paths.map((p, i) => (
                    <li key={i} className="dev-match__path">
                      <code>{p.via_id}</code>
                      {p.weight < 0.999 ? (
                        <>
                          <span className="dev-match__path-arrow">→</span>
                          <code>{p.req_id}</code>
                        </>
                      ) : null}
                      <span
                        className={`dev-match__path-weight dev-match__path-weight--${p.tier}`}
                        title={
                          p.weight >= 0.999
                            ? "Direct LIKES match"
                            : `1-hop RELATED_TO match (weight ${p.weight})`
                        }
                      >
                        ×{p.weight.toFixed(1)} · {p.tier}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {c.reasons && c.reasons.length > 0 ? (
              <ul className="dev-match__reasons">
                {c.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
