"use client";

// Hydration-safe mode hook. A demo run lives in sessionStorage, which the
// server can't see — so the server (and the first client paint) must render the
// build-time env mode, then settle to the real resolved mode after mount. Using
// appMode() directly in render would mismatch SSR whenever a demo session is
// active. Components that branch on mode in their JSX should use this.

import { useEffect, useState } from "react";
import { appMode, ENV_APP_MODE, type AppMode } from "./appMode";

export function useAppMode(): AppMode {
  const [mode, setMode] = useState<AppMode>(ENV_APP_MODE);
  useEffect(() => setMode(appMode()), []);
  return mode;
}
