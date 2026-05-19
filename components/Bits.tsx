"use client";

import { Check } from "lucide-react";

export function Card({
  children,
  className = "",
  onClick,
  interactive,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const lift = interactive ?? !!onClick;
  return (
    <div
      className={`card p-5 ${onClick ? "cursor-pointer" : ""} ${lift ? "lift" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function OutlineCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card-outline p-5 ${className}`}>{children}</div>;
}

export function CheckRow({
  label,
  done = true,
  loading = false,
  hint,
}: {
  label: string;
  done?: boolean;
  loading?: boolean;
  hint?: string;
}) {
  return (
    <div className="check-row">
      <span
        className={
          "mt-0.5 grid place-items-center h-6 w-6 rounded-full transition-colors duration-300 " +
          (done
            ? "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]"
            : loading
              ? "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]"
              : "bg-[var(--color-cream-warm)] text-[var(--color-muted)]")
        }
      >
        {done ? (
          <Check size={14} strokeWidth={3} className="animate-pop-check" />
        ) : loading ? (
          <span
            className="animate-spin-soft"
            style={{ width: 12, height: 12 }}
            aria-hidden
          />
        ) : (
          <span className="block h-1.5 w-1.5 rounded-full bg-current opacity-40" />
        )}
      </span>
      <div className="flex-1">
        <p
          className={
            "text-[14px] font-medium transition-colors " +
            (done || loading
              ? "text-[var(--color-ink)]"
              : "text-[var(--color-muted)]")
          }
        >
          {label}
        </p>
        {hint && (
          <p className="text-[13px] text-[var(--color-muted)] mt-0.5">{hint}</p>
        )}
      </div>
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return <span className="pill">{children}</span>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="label">{children}</label>;
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className="btn-primary"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="btn-secondary" onClick={onClick}>
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="btn-ghost" onClick={onClick}>
      {children}
    </button>
  );
}

export function PrivacyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12.5px] leading-relaxed text-[var(--color-muted)] text-center">
      {children}
    </p>
  );
}

export function ChipToggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="chip"
      data-selected={selected ? "true" : "false"}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

export function Avatar({ name, color = "sage" }: { name: string; color?: "sage" | "clay" | "sky" | "sand" }) {
  const bg = {
    sage: "bg-[var(--color-sage-soft)] text-[var(--color-sage-deep)]",
    clay: "bg-[var(--color-clay-soft)] text-[#7d4730]",
    sky: "bg-[var(--color-sky-soft)] text-[#3b5a73]",
    sand: "bg-[var(--color-sand)] text-[#6a5326]",
  }[color];
  const initial = name.charAt(0).toUpperCase();
  return (
    <span
      className={`inline-flex h-9 w-9 rounded-full items-center justify-center font-medium text-[14px] ${bg}`}
    >
      {initial}
    </span>
  );
}
