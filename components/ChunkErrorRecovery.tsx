"use client";

/**
 * ChunkErrorRecovery
 *
 * Catches the "Loading chunk X failed" / ChunkLoadError that Next.js throws
 * when the browser has a stale reference to a JS or CSS chunk whose content
 * hash changed since the page was first loaded — most commonly after an HMR
 * rebuild in dev, but also after a production deploy with the tab still open.
 *
 * On detection, force-reloads the page once. A sessionStorage timestamp
 * prevents a reload loop: if a chunk error happens again within ~4 seconds
 * of the previous reload, we surface the original error instead of retrying.
 */

import { useEffect } from "react";

const RELOAD_KEY = "homing:chunk-reload-ts";
const RELOAD_DEBOUNCE_MS = 4000;

function isChunkError(err: unknown): boolean {
  if (!err) return false;
  const e = err as Error & { reason?: Error };
  if (e?.name === "ChunkLoadError") return true;
  if (e?.reason?.name === "ChunkLoadError") return true;
  const msg = String(e?.message ?? e?.reason?.message ?? err);
  return /Loading chunk |Loading CSS chunk |ChunkLoadError|Failed to fetch dynamically imported|chunk [\w-]+ failed/i.test(
    msg,
  );
}

export function ChunkErrorRecovery() {
  useEffect(() => {
    function recover() {
      try {
        const last = window.sessionStorage.getItem(RELOAD_KEY);
        const now = Date.now();
        if (last && now - Number(last) < RELOAD_DEBOUNCE_MS) {
          // We just reloaded; another chunk error means something's actually
          // broken. Don't loop — let the original error surface.
          console.warn(
            "ChunkErrorRecovery: chunk error persists after reload; giving up.",
          );
          return;
        }
        window.sessionStorage.setItem(RELOAD_KEY, String(now));
      } catch {
        // sessionStorage unavailable (private mode, etc.) — reload anyway.
      }
      window.location.reload();
    }

    function onError(e: ErrorEvent) {
      if (isChunkError(e.error ?? e.message)) recover();
    }
    function onRejection(e: PromiseRejectionEvent) {
      if (isChunkError(e.reason)) recover();
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
