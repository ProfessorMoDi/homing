"use client";

interface Props {
  size?: number;
  className?: string;
  variant?: "soft" | "outline" | "flying";
}

export function Pigeon({ size = 64, className = "", variant = "soft" }: Props) {
  const stroke = variant === "outline" ? "#1b1d1c" : "none";
  const bodyFill = variant === "outline" ? "#faf7f2" : "#cfd8dc";
  const wingFill = variant === "outline" ? "#faf7f2" : "#a9bcc4";
  const accent = "#c97e63";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      {/* tail */}
      <path
        d="M14 56 Q4 60 8 68 L18 64 Z"
        fill={bodyFill}
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* body */}
      <path
        d="M20 56 C20 42 36 32 54 32 C70 32 82 42 80 56 C78 68 64 74 50 72 C36 70 22 68 20 56 Z"
        fill={bodyFill}
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* wing */}
      <path
        d="M36 44 C46 38 60 38 70 44 C66 54 56 58 46 58 C40 58 36 52 36 44 Z"
        fill={wingFill}
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
        className={variant === "flying" ? "animate-wing" : ""}
      />
      {/* neck dot */}
      <circle cx="74" cy="40" r="2.2" fill={accent} opacity="0.6" />
      {/* head */}
      <circle
        cx="78"
        cy="36"
        r="9"
        fill={bodyFill}
        stroke={stroke}
        strokeWidth="1.2"
      />
      {/* eye */}
      <circle cx="81" cy="34" r="1.4" fill="#1b1d1c" />
      {/* beak */}
      <path
        d="M86 36 L93 38 L86 40 Z"
        fill={accent}
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* legs */}
      <line
        x1="44"
        y1="70"
        x2="44"
        y2="78"
        stroke="#1b1d1c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="56"
        y1="72"
        x2="56"
        y2="78"
        stroke="#1b1d1c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
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
