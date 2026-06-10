"use client";

// Slim strip pinned to the top of the phone frame during a demo run. Makes it
// unmistakable that this is a throwaway walk-through where nothing is written.
// usePathname re-renders it on every navigation so it tracks the demo session
// as the user moves through the flow.

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isDemo, exitDemoSession } from "@/lib/appMode";

export function DemoBanner() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // pathname is read so the component re-evaluates isDemo() on navigation.
  void pathname;
  if (!mounted || !isDemo()) return null;

  function exit() {
    exitDemoSession();
    window.location.href = "/";
  }

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2 bg-[var(--color-ink)] text-white text-[12px]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-sage)] animate-live-pulse" />
        Demo · nothing you do is saved
      </span>
      <button
        type="button"
        onClick={exit}
        className="underline underline-offset-2 opacity-80 hover:opacity-100"
      >
        Exit demo
      </button>
    </div>
  );
}
