"use client";

// Module-level handoff for the audio blob and demo flag between /voice and
// /transcribing. Lives only in memory (same SPA session), never persisted.

let pendingBlob: Blob | null = null;
let pendingDemoMode = false;

export function stashAudio(blob: Blob, demoMode: boolean): void {
  pendingBlob = blob;
  pendingDemoMode = demoMode;
}

export function takeAudio(): { blob: Blob; demoMode: boolean } | null {
  if (!pendingBlob) return null;
  const out = { blob: pendingBlob, demoMode: pendingDemoMode };
  pendingBlob = null;
  pendingDemoMode = false;
  return out;
}
