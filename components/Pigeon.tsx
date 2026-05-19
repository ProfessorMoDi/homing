"use client";

interface Props {
  size?: number;
  className?: string;
  variant?: "soft" | "outline" | "flying" | "idle";
}

const MASCOT_SRC = "/homi.png";

export function Pigeon({ size = 64, className = "", variant = "soft" }: Props) {
  const shadow =
    variant === "flying"
      ? "drop-shadow-[0_8px_14px_rgba(31,38,28,0.18)]"
      : "drop-shadow-[0_2px_6px_rgba(31,38,28,0.08)]";
  const sway = variant === "idle" ? "animate-pigeon-sway" : "";
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={MASCOT_SRC}
      alt="Homi the pigeon"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      draggable={false}
      className={`object-contain select-none ${shadow} ${sway} ${className}`}
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
