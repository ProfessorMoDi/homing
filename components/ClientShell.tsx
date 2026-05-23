"use client";

import { usePathname } from "next/navigation";
import { DevModeProvider } from "../lib/devMode";
import { DevShell } from "./DevShell";

const FULL_BLEED_PREFIXES = ["/theory"];

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const fullBleed = FULL_BLEED_PREFIXES.some((p) => pathname.startsWith(p));
  return (
    <DevModeProvider>
      <DevShell fullBleed={fullBleed}>{children}</DevShell>
    </DevModeProvider>
  );
}
