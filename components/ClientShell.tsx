"use client";

import { usePathname } from "next/navigation";

const FULL_BLEED_PREFIXES = ["/theory"];

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const fullBleed = FULL_BLEED_PREFIXES.some((p) => pathname.startsWith(p));
  return fullBleed ? <>{children}</> : <div className="frame">{children}</div>;
}
