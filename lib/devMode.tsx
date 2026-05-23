"use client";

// Dev-mode is opt-in and persistent. Three ways to flip it on:
//   1. Visit any page with ?dev=1 (writes localStorage flag, persists)
//   2. The flag persists across reloads — no need to re-add the param
//   3. Cmd+\ / Ctrl+\ — first press enables dev mode and opens the panel;
//      subsequent presses toggle the panel open/closed
//
// To turn dev mode off entirely, click the × on the floating DEV badge or
// visit any page with ?dev=0.
//
// Production users never see anything by default. The DevShell short-circuits
// to a normal frame when isDevModeEnabled() returns false, and the heavy
// DevPanel tree is dynamic-imported so it doesn't ship in the bundle for
// users who never opt in.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ENABLED_KEY = "homing-dev";
const OPEN_KEY = "homing-dev-open";
const URL_PARAM = "dev";
const KEYBOARD_KEY = "\\";

export function isDevModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(URL_PARAM)) {
      const v = params.get(URL_PARAM);
      if (v === "0" || v === "false") {
        localStorage.removeItem(ENABLED_KEY);
        return false;
      }
      localStorage.setItem(ENABLED_KEY, "1");
      return true;
    }
    return localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

interface DevModeCtx {
  enabled: boolean;
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  enable: () => void;
  disable: () => void;
}

const Ctx = createContext<DevModeCtx | null>(null);

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpenState] = useState(false);

  // Hydrate from storage / URL after mount to avoid SSR mismatch.
  useEffect(() => {
    const isOn = isDevModeEnabled();
    setEnabled(isOn);
    if (isOn) {
      try {
        setOpenState(localStorage.getItem(OPEN_KEY) === "1");
      } catch {}
    }
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setOpenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(OPEN_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const enable = useCallback(() => {
    try {
      localStorage.setItem(ENABLED_KEY, "1");
      localStorage.setItem(OPEN_KEY, "1");
    } catch {}
    setEnabled(true);
    setOpenState(true);
  }, []);

  const disable = useCallback(() => {
    try {
      localStorage.removeItem(ENABLED_KEY);
      localStorage.removeItem(OPEN_KEY);
    } catch {}
    setEnabled(false);
    setOpenState(false);
  }, []);

  // Cmd+\ / Ctrl+\. First press enables dev mode + opens the panel;
  // subsequent presses toggle the panel. Listener stays mounted regardless
  // of state so the shortcut works as a global "open developer panel".
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== KEYBOARD_KEY) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      if (!enabled) {
        enable();
      } else {
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, toggle, enable]);

  const value = useMemo<DevModeCtx>(
    () => ({ enabled, open, toggle, setOpen, enable, disable }),
    [enabled, open, toggle, setOpen, enable, disable],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Returns the current dev-mode state. Outside DevModeProvider this returns
// a no-op shape so callers don't need to null-check.
export function useDevMode(): DevModeCtx {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  return {
    enabled: false,
    open: false,
    toggle: () => {},
    setOpen: () => {},
    enable: () => {},
    disable: () => {},
  };
}
