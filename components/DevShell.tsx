"use client";

// Split-screen wrapper for the developer panel.
//
// When dev mode is off (the default for everyone), this component renders the
// mobile frame in its usual centred position — zero layout impact, no fetch
// interception, no extra bundle for users who never opted in.
//
// When dev mode is on AND the panel is open, the frame docks to the left and
// a DevPanel fills the rest of the viewport. The fetch interceptor is
// installed inside a `useEffect` so it only runs on the client and only when
// active; cleanup restores `window.fetch` on unmount.

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useDevMode } from "../lib/devMode";
import { describeRequest, devBus } from "../lib/devBus";
import { DemoBanner } from "./DemoBanner";

// DevPanel is dynamic-imported with SSR disabled so it never lands in the
// shared bundle for users who don't enable dev mode.
const DevPanel = dynamic(() => import("./DevPanel").then((m) => m.DevPanel), {
  ssr: false,
});
const DevToggleButton = dynamic(
  () => import("./DevToggleButton").then((m) => m.DevToggleButton),
  { ssr: false },
);

interface Props {
  children: React.ReactNode;
  fullBleed: boolean;
}

export function DevShell({ children, fullBleed }: Props) {
  const { enabled, open } = useDevMode();
  useFetchInterceptor(enabled);

  const splitting = enabled && open;

  // Full-bleed routes (e.g. /theory) bypass the frame entirely. Even with
  // dev panel open we leave them alone — the panel can still render
  // alongside, but the page itself controls its own layout.
  const content = fullBleed ? (
    <>{children}</>
  ) : (
    <div className="frame">
      <DemoBanner />
      {children}
    </div>
  );

  if (!enabled) return content;

  return (
    <div className={splitting ? "dev-shell dev-shell--split" : "dev-shell"}>
      <div className="dev-shell__app">{content}</div>
      {splitting ? (
        <aside className="dev-shell__panel">
          <DevPanel />
        </aside>
      ) : null}
      <DevToggleButton />
    </div>
  );
}

// Install once when enabled flips true. Restore on unmount or when disabled.
function useFetchInterceptor(enabled: boolean) {
  const installed = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (installed.current) return;
    if (typeof window === "undefined") return;

    const original = window.fetch.bind(window);
    installed.current = true;

    const patched: typeof fetch = async (input, init) => {
      // Only log calls to our own API surface — third-party noise (fonts,
      // analytics, dynamic-import chunks) would drown the timeline.
      const desc = describeRequest(input, init);
      const isOurApi = desc.url.startsWith("/api/");

      if (!isOurApi) {
        return original(input as RequestInfo, init);
      }

      const id = devBus.newId();
      const startedAt = Date.now();
      const startPerf = performance.now();

      devBus.start({
        id,
        method: desc.method,
        url: desc.url,
        fullUrl: desc.fullUrl,
        requestBody: desc.requestBody,
        requestHeaders: desc.requestHeaders,
        startedAt,
      });

      try {
        const res = await original(input as RequestInfo, init);
        const ms = Math.round(performance.now() - startPerf);

        // Clone before reading the body — the original Response still has to
        // be readable by the calling code. Read body asynchronously and
        // patch the event when it lands; UI doesn't wait.
        const cloned = res.clone();
        readBody(cloned).then((responseBody) => {
          devBus.finish(id, {
            status: res.status,
            ms,
            responseBody,
            state: res.ok ? "done" : "error",
          });
        });

        return res;
      } catch (err) {
        const ms = Math.round(performance.now() - startPerf);
        devBus.fail(id, err instanceof Error ? err.message : String(err), ms);
        throw err;
      }
    };

    window.fetch = patched;

    return () => {
      if (window.fetch === patched) window.fetch = original;
      installed.current = false;
    };
  }, [enabled]);
}

async function readBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) return await res.json();
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text.length > 4000 ? text.slice(0, 4000) + "…" : text;
    }
  } catch (err) {
    return { _readError: err instanceof Error ? err.message : String(err) };
  }
}
