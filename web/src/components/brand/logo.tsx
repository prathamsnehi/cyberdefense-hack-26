import { useId, useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

import { ALBERT_MARK_PATH, ALBERT_MARK_VIEWBOX } from "./albert-mark-path";

const lockupSizes = {
  sm: "text-title",
  md: "text-display-sm",
  lg: "text-display-md",
  xl: "text-display-xl",
} as const;

/** Gap between bar and wordmark, tuned per size (smaller sizes need a bit more air). */
const lockupGaps = {
  sm: "gap-[0.24em]",
  md: "gap-[0.22em]",
  lg: "gap-[0.2em]",
  xl: "gap-[0.18em]",
} as const satisfies Record<keyof typeof lockupSizes, string>;

/** Extra space after the mark, so the mark reads as its own unit before the bar. */
const markGaps = {
  sm: "mr-[0.16em]",
  md: "mr-[0.14em]",
  lg: "mr-[0.12em]",
  xl: "mr-[0.1em]",
} as const satisfies Record<keyof typeof lockupSizes, string>;

export type LogoSize = keyof typeof lockupSizes;
export type LogoVariant = "lockup" | "eyebrow";

interface AlbertMarkProps {
  /** When set, the mark is exposed to assistive tech with this name. Otherwise it is decorative. */
  title?: string;
  className?: string;
}

/**
 * Albert AI mark: Einstein hair plus mustache silhouette.
 * Inherits color from `currentColor`. Decorative (aria-hidden) unless a title is given.
 */
export function AlbertMark({ title, className }: AlbertMarkProps) {
  const titleId = useId();
  const labelled = Boolean(title);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={ALBERT_MARK_VIEWBOX}
      fill="currentColor"
      focusable="false"
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-labelledby={labelled ? titleId : undefined}
      data-slot="albert-mark"
      className={cn("shrink-0", className)}
    >
      {labelled ? <title id={titleId}>{title}</title> : null}
      <path fillRule="nonzero" d={ALBERT_MARK_PATH} />
    </svg>
  );
}

interface LogoProps {
  /** "lockup": mark, vertical accent bar, wordmark. "eyebrow": tiny mark, short rule, letter-spaced label. */
  variant?: LogoVariant;
  /** Lockup size. Ignored by the eyebrow variant. */
  size?: LogoSize;
  /** When set, the logo renders as a link. */
  href?: string;
  /** Accessible name. Defaults to "Albert AI". */
  label?: string;
  /** Plays the entrance animation (mark, then bar, then wordmark). Lockup only. */
  animate?: boolean;
  /** Base delay in ms before the mark animates. */
  delay?: number;
  /** Delay in ms between each step (mark, bar, wordmark). */
  stagger?: number;
  className?: string;
}

function delayStyle(enabled: boolean, ms: number): CSSProperties | undefined {
  return enabled ? { animationDelay: `${ms}ms` } : undefined;
}

/**
 * Albert AI brand mark from the deck.
 * Lockup: white Einstein mark, thick vertical accent bar on the baseline, then the wordmark.
 * Eyebrow: tiny mark, short horizontal accent rule, uppercase letter-spaced "ALBERT AI".
 */
export function Logo({
  variant = "lockup",
  size = "md",
  href,
  label = "Albert AI",
  animate = false,
  delay = 0,
  stagger = 50,
  className,
}: LogoProps) {
  const isLockup = variant === "lockup";
  const shouldAnimate = isLockup && animate;
  const markScaleRef = useRef<HTMLSpanElement>(null);

  // anim-fade-up handles opacity + translateY. The slight scale-in runs on an inner wrapper
  // so the two transforms never fight. Held at the start frame during the delay.
  useLayoutEffect(() => {
    if (!shouldAnimate) return undefined;
    const el = markScaleRef.current;
    if (!el || typeof el.animate !== "function") return undefined;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }
    const animation = el.animate(
      [{ transform: "scale(0.94)" }, { transform: "scale(1)" }],
      {
        duration: 560,
        delay,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "backwards",
      },
    );
    return () => animation.cancel();
  }, [shouldAnimate, delay]);

  const content = isLockup ? (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "relative top-[0.18em] inline-block h-[1.1em] w-[1.19em] shrink-0 text-foreground",
          markGaps[size],
          shouldAnimate && "anim-fade-up",
        )}
        style={delayStyle(shouldAnimate, delay)}
      >
        <span ref={markScaleRef} className="block h-full w-full origin-center">
          <AlbertMark className="block h-full w-full" />
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-[0.74em] w-[0.16em] shrink-0 origin-bottom bg-accent-brand",
          shouldAnimate && "anim-logo-bar",
        )}
        style={delayStyle(shouldAnimate, delay + stagger)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "inline-block font-display font-bold tracking-normal whitespace-nowrap text-foreground",
          shouldAnimate && "anim-logo-word",
        )}
        style={delayStyle(shouldAnimate, delay + stagger * 2)}
      >
        Albert AI
      </span>
    </>
  ) : (
    <>
      <AlbertMark className="block h-[1.25em] w-[1.35em] text-foreground" />
      <span aria-hidden="true" className="inline-block h-0.5 w-6 shrink-0 bg-accent-brand" />
      <span
        aria-hidden="true"
        className="font-sans font-medium uppercase tracking-eyebrow whitespace-nowrap text-muted-foreground"
      >
        Albert AI
      </span>
    </>
  );

  const rootClass = cn(
    isLockup
      ? cn("inline-flex items-baseline leading-none", lockupSizes[size], lockupGaps[size])
      : "inline-flex items-center gap-3 text-eyebrow",
    className,
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={label}
        data-slot="logo"
        className={cn(rootClass, "rounded-sm")}
      >
        {content}
      </a>
    );
  }

  return (
    <span role="img" aria-label={label} data-slot="logo" className={rootClass}>
      {content}
    </span>
  );
}
