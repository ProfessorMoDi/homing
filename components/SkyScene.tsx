"use client";

/**
 * SkyScene
 *
 * Ambient backdrop for the voice-recording page. Three things happen here:
 *
 *   1. Five clouds drift continuously from left to right at two depths
 *      (slower / larger / dimmer in the back, faster / smaller / brighter
 *      in the front). Each cloud uses a negative animation-delay so the
 *      composition is already populated on first paint instead of starting
 *      empty.
 *
 *   2. While `active` is true, a single small pigeon glides along a true
 *      cubic-bezier S-curve via CSS `offset-path`. The path is defined in
 *      globals.css; the bird fades in at 7% and out at 93% so it never
 *      hard-pops at the edges. A separate inner div tilts the bird subtly
 *      in sync with the path's peaks and valleys.
 *
 *   3. Everything is purely decorative — pointer-events disabled, no React
 *      state, no rAF, no per-frame work. The browser composites all motion
 *      on the GPU.
 */

interface CloudProps {
  top: string;
  size: number;
  duration: number;
  delay: number;
  opacity?: number;
  zIndex?: number;
}

function Cloud({
  top,
  size,
  duration,
  delay,
  opacity = 0.6,
  zIndex = 0,
}: CloudProps) {
  return (
    <svg
      viewBox="0 0 64 40"
      width={Math.round(size * 1.6)}
      height={size}
      className="absolute animate-cloud-drift"
      style={
        {
          top,
          left: 0,
          opacity,
          zIndex,
          ["--cloud-duration" as string]: `${duration}s`,
          ["--cloud-delay" as string]: `${delay}s`,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <defs>
        <radialGradient
          id={`cloud-grad-${size}-${duration}`}
          cx="42%"
          cy="38%"
          r="65%"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#f4f1ea" stopOpacity="1" />
        </radialGradient>
      </defs>
      <path
        d="M 12 28 Q 4 28 4 22 Q 4 16 12 16 Q 14 10 22 11 Q 30 6 38 12 Q 48 10 52 18 Q 60 18 60 24 Q 60 30 52 30 Z"
        fill={`url(#cloud-grad-${size}-${duration})`}
      />
    </svg>
  );
}

interface SkySceneProps {
  /** When true, the gliding pigeon is rendered along its bezier path. */
  active: boolean;
  className?: string;
}

export function SkyScene({ active, className = "" }: SkySceneProps) {
  return (
    <div
      className={
        "absolute inset-0 pointer-events-none overflow-hidden " + className
      }
      aria-hidden
    >
      {/* Back depth — large, slow, dimmer. */}
      <Cloud top="18%" size={42} duration={38} delay={0} opacity={0.55} />
      <Cloud top="52%" size={36} duration={42} delay={-14} opacity={0.45} />
      <Cloud top="76%" size={30} duration={34} delay={-22} opacity={0.5} />

      {/* Front depth — smaller, faster, more present. */}
      <Cloud
        top="34%"
        size={22}
        duration={24}
        delay={-8}
        opacity={0.65}
        zIndex={1}
      />
      <Cloud
        top="62%"
        size={20}
        duration={28}
        delay={-3}
        opacity={0.55}
        zIndex={1}
      />

      {active && <FlightPath />}
    </div>
  );
}

/**
 * The flying pigeon. Two nested elements:
 *   - .pigeon-flight runs the offset-path animation.
 *   - .pigeon-flight-tilt rotates the bird independently so the tilt stacks
 *     on top of the path's translation.
 */
function FlightPath() {
  return (
    <div className="pigeon-flight" style={{ zIndex: 2 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/homi.png"
        alt=""
        width={44}
        height={44}
        draggable={false}
        className="pigeon-flight-tilt block w-full h-full object-contain select-none drop-shadow-[0_4px_10px_rgba(31,38,28,0.18)]"
      />
    </div>
  );
}
