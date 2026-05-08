import Link from "next/link";
import { useId } from "react";

/** Radial network mark: you at the center, orbit ring, linked nodes. */
export function NetworkGlyph({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const stroke = `url(#${uid}-stroke)`;
  const nodeFill = `url(#${uid}-node)`;

  return (
    <svg
      className={["shrink-0 overflow-visible", className].filter(Boolean).join(" ")}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-stroke`} x1="4" y1="10" x2="60" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.45" stopColor="#a855f7" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
        <radialGradient id={`${uid}-node`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 32) rotate(90) scale(28)">
          <stop stopColor="#e9d5ff" />
          <stop offset="0.45" stopColor="#a855f7" />
          <stop offset="1" stopColor="#6366f1" />
        </radialGradient>
        <linearGradient id={`${uid}-halo`} x1="32" y1="8" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0abfc" stopOpacity="0.45" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="26" stroke={stroke} strokeWidth="0.65" strokeDasharray="3.5 5.5" opacity="0.55" />

      <path
        d="M32 32 L32 11 M32 32 L51.2 21.5 M32 32 L51.2 42.5 M32 32 L32 53 M32 32 L12.8 42.5 M32 32 L12.8 21.5"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.88"
      />
      <path
        d="M51.2 21.5 Q32 32 51.2 42.5 M12.8 21.5 Q32 32 12.8 42.5 M32 11 Q44 32 51.2 21.5"
        stroke={stroke}
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.42"
      />

      <circle cx="32" cy="11" r="3.2" fill={nodeFill} className="drop-shadow-[0_0_6px_rgba(168,85,247,0.45)]" />
      <circle cx="51.2" cy="21.5" r="2.65" fill={nodeFill} opacity="0.92" />
      <circle cx="51.2" cy="42.5" r="2.65" fill={nodeFill} opacity="0.92" />
      <circle cx="32" cy="53" r="3.2" fill={nodeFill} className="drop-shadow-[0_0_6px_rgba(56,189,248,0.35)]" />
      <circle cx="12.8" cy="42.5" r="2.65" fill={nodeFill} opacity="0.92" />
      <circle cx="12.8" cy="21.5" r="2.65" fill={nodeFill} opacity="0.92" />

      <circle cx="32" cy="32" r="8" fill={`url(#${uid}-halo)`} opacity="0.9" />
      <circle
        cx="32"
        cy="32"
        r="5.25"
        fill={nodeFill}
        stroke="white"
        strokeWidth="1.35"
        className="drop-shadow-[0_2px_12px_rgba(99,102,241,0.55)] dark:stroke-zinc-900"
      />
    </svg>
  );
}

const wordmarkGradient =
  "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 bg-clip-text text-transparent dark:from-sky-300 dark:via-fuchsia-300 dark:to-amber-200";

type AppLogoLockupProps = {
  layout?: "horizontal" | "vertical";
  size?: "nav" | "hero";
  href?: string;
  className?: string;
};

/**
 * Brand lockup: network glyph + FindMyNetwork wordmark.
 * `size="hero"` is for the landing page; `nav` for headers and compact rows.
 */
export function AppLogoLockup({
  layout = "horizontal",
  size = "nav",
  href,
  className,
}: AppLogoLockupProps) {
  const isHero = size === "hero";
  const glyphClass = isHero ? "h-24 w-24 sm:h-28 sm:w-28 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:scale-[1.03]" : "h-10 w-10 sm:h-11 sm:w-11";
  const textClass = isHero
    ? [wordmarkGradient, "text-4xl font-extrabold tracking-tight sm:text-5xl"].join(" ")
    : [wordmarkGradient, "text-xl font-bold tracking-tight sm:text-2xl"].join(" ");

  const inner = (
    <>
      <NetworkGlyph className={glyphClass} />
      <span className={textClass}>FindMyNetwork</span>
    </>
  );

  const rowClass =
    layout === "vertical"
      ? "flex flex-col items-center gap-5 text-center"
      : "flex items-center gap-3 sm:gap-4";

  const wrapClass = [rowClass, href && "group rounded-2xl outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500", className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={wrapClass}>
        {inner}
      </Link>
    );
  }

  return <div className={wrapClass}>{inner}</div>;
}
