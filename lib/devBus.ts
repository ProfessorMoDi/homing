"use client";

// In-memory event bus for the developer panel. Holds a ring buffer of recent
// fetch() round-trips so the UI can render a timeline + detail views without
// re-issuing the requests.
//
// Implemented as a vanilla external store + `useSyncExternalStore` hook so
// React batches updates across bursts (e.g. 3 parallel Neo4j calls coming
// back near-simultaneously) into a single render. No third-party state lib.

import { useSyncExternalStore } from "react";

const RING_CAPACITY = 100;

export interface DevEvent {
  id: string;                  // stable per round-trip; matches start → end
  method: string;
  url: string;                 // pathname + search (no host, easier to read)
  fullUrl: string;             // host included, for copy/paste
  requestBody: unknown;        // parsed JSON or { kind: "form" | "binary" | "text", preview }
  requestHeaders?: Record<string, string>;
  startedAt: number;           // epoch ms
  ms?: number;                 // duration, set on completion
  status?: number;             // HTTP status, set on completion
  responseBody?: unknown;      // parsed JSON or text
  error?: string;              // present if the request threw
  state: "pending" | "done" | "error";
}

type Listener = () => void;

class DevBus {
  private events: DevEvent[] = [];
  private listeners = new Set<Listener>();
  private snapshot: DevEvent[] = [];
  private nextId = 1;

  // Cached snapshot — useSyncExternalStore requires a stable reference
  // between calls when the underlying data hasn't changed.
  getSnapshot = (): DevEvent[] => this.snapshot;

  getServerSnapshot = (): DevEvent[] => EMPTY;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  newId(): string {
    return `e_${Date.now().toString(36)}_${(this.nextId++).toString(36)}`;
  }

  start(ev: Omit<DevEvent, "state">): string {
    const full: DevEvent = { ...ev, state: "pending" };
    this.events.push(full);
    if (this.events.length > RING_CAPACITY) this.events.shift();
    this.publish();
    return full.id;
  }

  finish(
    id: string,
    patch: Pick<DevEvent, "status" | "ms" | "responseBody"> & {
      state?: "done" | "error";
    },
  ): void {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return;
    this.events[idx] = {
      ...this.events[idx],
      ...patch,
      state: patch.state ?? "done",
    };
    this.publish();
  }

  fail(id: string, error: string, ms: number): void {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return;
    this.events[idx] = {
      ...this.events[idx],
      state: "error",
      error,
      ms,
    };
    this.publish();
  }

  clear(): void {
    this.events = [];
    this.publish();
  }

  private publish(): void {
    // Fresh array reference so React sees a change. Reverse so newest events
    // are at index 0 — the timeline reads top-down chronologically.
    this.snapshot = this.events.slice().reverse();
    for (const l of this.listeners) l();
  }
}

const EMPTY: DevEvent[] = [];

export const devBus = new DevBus();

export function useDevEvents(): DevEvent[] {
  return useSyncExternalStore(
    devBus.subscribe,
    devBus.getSnapshot,
    devBus.getServerSnapshot,
  );
}

// Helpers ─────────────────────────────────────────────────────────────────

export function describeRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): {
  method: string;
  url: string;
  fullUrl: string;
  requestBody: unknown;
  requestHeaders?: Record<string, string>;
} {
  const fullUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  let url = fullUrl;
  try {
    const u = new URL(fullUrl, typeof window !== "undefined" ? window.location.origin : undefined);
    url = u.pathname + (u.search || "");
  } catch {}

  const method = (
    init?.method ??
    (input instanceof Request ? input.method : "GET")
  ).toUpperCase();

  const requestHeaders = normalizeHeaders(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const requestBody = previewRequestBody(init?.body);

  return { method, url, fullUrl, requestBody, requestHeaders };
}

function normalizeHeaders(h?: HeadersInit | Headers): Record<string, string> | undefined {
  if (!h) return undefined;
  const out: Record<string, string> = {};
  if (h instanceof Headers) {
    h.forEach((v, k) => (out[k] = v));
    return out;
  }
  if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = String(v);
    return out;
  }
  return { ...(h as Record<string, string>) };
}

function previewRequestBody(body: BodyInit | null | undefined): unknown {
  if (body == null) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body.length > 1000 ? body.slice(0, 1000) + "…" : body;
    }
  }
  if (body instanceof FormData) {
    const fields: Record<string, string> = {};
    body.forEach((v, k) => {
      fields[k] =
        v instanceof File
          ? `<File: ${v.name} (${v.size} bytes, ${v.type || "unknown"})>`
          : String(v);
    });
    return { kind: "FormData", fields };
  }
  if (body instanceof Blob) {
    return { kind: "Blob", size: body.size, type: body.type };
  }
  if (body instanceof ArrayBuffer) {
    return { kind: "ArrayBuffer", byteLength: body.byteLength };
  }
  return { kind: "unknown", value: String(body).slice(0, 200) };
}

// Color hint per endpoint family. Matches the app's palette tokens.
export function colorForUrl(url: string): "sage" | "clay" | "sky" | "sand" | "ink" {
  if (url.startsWith("/api/neo4j")) return "sage";
  if (url.startsWith("/api/analyze") || url.startsWith("/api/suggest")) return "clay";
  if (url.startsWith("/api/transcribe")) return "sky";
  if (url.startsWith("/api/")) return "sand";
  return "ink";
}

// Short label for the timeline (last meaningful path segment).
export function shortLabel(url: string): string {
  const path = url.split("?")[0];
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "api") return "/" + parts.slice(1).join("/");
  return path;
}
