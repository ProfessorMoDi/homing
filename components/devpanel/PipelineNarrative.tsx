"use client";

import { useMemo } from "react";
import type { DevEvent } from "../../lib/devBus";
import { rollupStages, stageForUrl, type StageId } from "./pipeline";

// Horizontal narrative strip — the spine of the dev panel. Shows every
// pipeline stage as a chip, with status (idle / running / done / error),
// count of events, and total ms. Clicking a chip pins the focus to that
// stage; below the strip we show "what's happening" copy for the focused
// stage and its step-by-step breakdown.

interface Props {
  events: DevEvent[];
  focusedStage: StageId | "auto";
  onFocusStage: (id: StageId | "auto") => void;
  selectedUrl: string | null;
}

export function PipelineNarrative({ events, focusedStage, onFocusStage, selectedUrl }: Props) {
  const rollups = useMemo(() => rollupStages(events), [events]);

  // Auto-focus: the most recently active stage (latest non-idle event).
  const autoStage: StageId | null = useMemo(() => {
    if (selectedUrl) return stageForUrl(selectedUrl);
    for (const r of rollups) {
      if (r.status === "running" || r.status === "error") return r.stage.id;
    }
    // pick the latest 'done' across all stages
    const withLatest = rollups
      .filter((r) => r.latest)
      .sort((a, b) => (b.latest?.startedAt ?? 0) - (a.latest?.startedAt ?? 0));
    return withLatest[0]?.stage.id ?? null;
  }, [rollups, selectedUrl]);

  const effectiveFocus: StageId | null =
    focusedStage === "auto" ? autoStage : focusedStage;
  const focused = rollups.find((r) => r.stage.id === effectiveFocus) ?? null;

  return (
    <div className="dev-narrative">
      <ol className="dev-narrative__strip">
        {rollups.map((r, i) => {
          const active = r.stage.id === effectiveFocus;
          return (
            <li key={r.stage.id} className="dev-narrative__stage-wrap">
              {i > 0 ? <span className="dev-narrative__arrow">→</span> : null}
              <button
                type="button"
                onClick={() => onFocusStage(active ? "auto" : r.stage.id)}
                className={
                  "dev-narrative__stage" +
                  ` is-${r.status}` +
                  (active ? " is-focused" : "")
                }
                title={r.stage.short}
              >
                <span className="dev-narrative__name">{r.stage.name}</span>
                <span className="dev-narrative__meta">
                  {r.status === "idle" ? (
                    <span className="dev-narrative__idle">idle</span>
                  ) : (
                    <>
                      <span className="dev-narrative__count">×{r.count}</span>
                      {r.status === "running" ? (
                        <span className="dev-narrative__status-dot dev-narrative__status-dot--running" />
                      ) : r.status === "error" ? (
                        <span className="dev-narrative__status-dot dev-narrative__status-dot--error" />
                      ) : (
                        <span className="dev-narrative__status-dot dev-narrative__status-dot--done" />
                      )}
                      {r.totalMs > 0 ? (
                        <span className="dev-narrative__ms">{r.totalMs}ms</span>
                      ) : null}
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {focused ? (
        <div className="dev-narrative__detail">
          <div className="dev-narrative__detail-head">
            <h4>{focused.stage.name}</h4>
            <span className="dev-narrative__short">{focused.stage.short}</span>
          </div>
          <p className="dev-narrative__what">{focused.stage.what}</p>
          {focused.stage.steps.length > 0 ? (
            <ol className="dev-narrative__steps">
              {focused.stage.steps.map((s, i) => (
                <li key={i}>
                  <span className="dev-narrative__step-num">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : (
        <p className="dev-narrative__empty">
          Walk through the mobile app on the left. Each stage of the pipeline
          will light up here as the calls fire — click a stage to read what's
          happening, or hit any row in the timeline below.
        </p>
      )}
    </div>
  );
}
