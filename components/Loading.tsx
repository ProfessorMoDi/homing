"use client";

export function ThinkingDots({
  className = "",
  size = "default",
}: {
  className?: string;
  size?: "small" | "default";
}) {
  return (
    <span
      className={`dot-wave ${size === "small" ? "scale-75" : ""} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span />
      <span />
      <span />
    </span>
  );
}

export function BreathingOrb({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <span className="breathe-orb-2" />
      <span className="breathe-orb" />
      <div className="relative grid place-items-center w-full h-full">
        {children}
      </div>
    </div>
  );
}

export function SoftSpinner({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`animate-spin-soft ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div className="progress-bar">
      <span style={{ transform: `scaleX(${pct})` }} />
    </div>
  );
}
