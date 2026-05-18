"use client";

interface Props {
  size?: number;
  className?: string;
  variant?: "soft" | "outline" | "flying";
}

const MASCOT_SRC = "/homi.jpg";

export function Pigeon({ size = 64, className = "", variant = "soft" }: Props) {
  const radius = Math.max(8, Math.round(size * 0.18));
  const ringClass =
    variant === "outline"
      ? "ring-1 ring-[var(--color-line)]"
      : variant === "flying"
        ? "shadow-[0_6px_14px_rgba(31,38,28,0.12)]"
        : "";
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={MASCOT_SRC}
      alt="Homi the pigeon"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: radius }}
      draggable={false}
      className={`object-cover select-none ${ringClass} ${className}`}
    />
  );
}

export function PigeonMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Pigeon size={size} />
    </span>
  );
}

export function FlyingPigeon({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 animate-fly">
        <Pigeon size={56} variant="flying" />
      </div>
    </div>
  );
}
