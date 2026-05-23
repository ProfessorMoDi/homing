"use client";

import { useDevMode } from "../lib/devMode";

// Floating bottom-right toggle. Only rendered when dev mode is enabled —
// production users never see it.
export function DevToggleButton() {
  const { enabled, open, toggle, disable } = useDevMode();
  if (!enabled) return null;

  return (
    <div className="dev-toggle" data-open={open ? "1" : "0"}>
      <button
        type="button"
        onClick={toggle}
        className="dev-toggle__btn"
        title={open ? "Close dev panel (⌘\\)" : "Open dev panel (⌘\\)"}
      >
        <span className="dev-toggle__dot" />
        <span className="dev-toggle__label">DEV</span>
      </button>
      <button
        type="button"
        onClick={disable}
        className="dev-toggle__exit"
        title="Disable developer mode (remove ?dev=1)"
      >
        ×
      </button>
    </div>
  );
}
