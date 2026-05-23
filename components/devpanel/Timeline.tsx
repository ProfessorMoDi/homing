"use client";

import { colorForUrl, shortLabel, type DevEvent } from "../../lib/devBus";

interface Props {
  events: DevEvent[];
  selectedId: string | null;
  pinnedId: string | null;
  onSelect: (id: string) => void;
}

export function Timeline({ events, selectedId, pinnedId, onSelect }: Props) {
  return (
    <ol className="dev-timeline">
      {events.map((ev) => {
        const color = colorForUrl(ev.url);
        const isSelected = ev.id === selectedId;
        const isPinned = ev.id === pinnedId;
        const isError = ev.state === "error" || (ev.status != null && ev.status >= 400);
        return (
          <li key={ev.id} className="dev-timeline__item">
            <button
              type="button"
              onClick={() => onSelect(ev.id)}
              className={
                "dev-timeline__row" +
                (isSelected ? " is-selected" : "") +
                (isPinned ? " is-pinned" : "") +
                (isError ? " is-error" : "")
              }
            >
              <span
                className={`dev-timeline__bar dev-timeline__bar--${color}`}
              />
              <span className="dev-timeline__method">{ev.method}</span>
              <span className="dev-timeline__path">{shortLabel(ev.url)}</span>
              <span className="dev-timeline__status">
                {ev.state === "pending" ? (
                  <span className="dev-timeline__pending">…</span>
                ) : ev.state === "error" ? (
                  <span className="dev-timeline__status-err">ERR</span>
                ) : (
                  <span className="dev-timeline__status-ok">{ev.status}</span>
                )}
              </span>
              <span className="dev-timeline__ms">
                {ev.ms != null ? `${ev.ms} ms` : ""}
              </span>
            </button>
          </li>
        );
      })}
      {events.length === 0 ? (
        <li className="dev-timeline__placeholder">
          No requests yet. Trigger an action in the mobile app.
        </li>
      ) : null}
    </ol>
  );
}
