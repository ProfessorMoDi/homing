"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { PigeonMark } from "./Pigeon";

interface Props {
  children: React.ReactNode;
  title?: string;
  back?: string | true;
  right?: React.ReactNode;
  noTopBar?: boolean;
  padded?: boolean;
}

export function AppShell({
  children,
  title,
  back,
  right,
  noTopBar = false,
  padded = true,
}: Props) {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-dvh">
      {!noTopBar && (
        <header className="topbar px-4 py-3 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {back ? (
              <button
                aria-label="Back"
                className="btn-ghost px-2 -ml-2"
                onClick={() =>
                  typeof back === "string" ? router.push(back) : router.back()
                }
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <Link href="/" className="flex items-center gap-2 -ml-1">
                <PigeonMark size={22} />
                <span className="display text-[17px]">HOMING</span>
              </Link>
            )}
            {title && (
              <span className="text-[15px] font-medium text-[var(--color-ink)] truncate ml-1">
                {title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">{right}</div>
        </header>
      )}
      <main className={padded ? "flex-1 px-5 py-5" : "flex-1"}>{children}</main>
    </div>
  );
}

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={
            "h-1.5 rounded-full transition-all " +
            (i === current
              ? "w-6 bg-[var(--color-ink)]"
              : "w-1.5 bg-[var(--color-line)]")
          }
        />
      ))}
    </div>
  );
}

export function Section({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="text-[15px] font-medium text-[var(--color-ink)]">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[13px] text-[var(--color-muted)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
