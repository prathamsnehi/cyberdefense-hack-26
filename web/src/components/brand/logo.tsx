import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

const lockupSizes = {
  sm: "text-title",
  md: "text-display-sm",
  lg: "text-display-md",
  xl: "text-display-xl",
} as const;

export type LogoSize = keyof typeof lockupSizes;
export type LogoVariant = "lockup" | "eyebrow";

interface LogoProps {
  /** "lockup": vertical accent bar plus wordmark. "eyebrow": short rule plus letter-spaced label. */
  variant?: LogoVariant;
  /** Lockup size. Ignored by the eyebrow variant. */
  size?: LogoSize;
  /** When set, the logo renders as a link. */
  href?: string;
  /** Accessible name. Defaults to "Albert AI". */
  label?: string;
  /** Plays the entrance animation (bar, then wordmark). Lockup only. */
  animate?: boolean;
  /** Base delay in ms before the bar animates. */
  delay?: number;
  /** Delay in ms between the bar and the wordmark. */
  stagger?: number;
  className?: string;
}

function delayStyle(enabled: boolean, ms: number): CSSProperties | undefined {
  return enabled ? { animationDelay: `${ms}ms` } : undefined;
}

/**
 * Albert AI brand mark from the deck.
 * Lockup: thick vertical accent bar sitting on the baseline, cap height tall, next to the wordmark.
 * Eyebrow: short horizontal accent rule plus uppercase, letter-spaced "ALBERT AI".
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
  const content =
    variant === "lockup" ? (
      <>
        <span
          aria-hidden="true"
          className={cn(
            "inline-block h-[0.74em] w-[0.16em] shrink-0 origin-bottom bg-accent-brand",
            animate && "anim-logo-bar",
          )}
          style={delayStyle(animate, delay)}
        />
        <span
          aria-hidden="true"
          className={cn(
            "inline-block font-display font-bold tracking-normal whitespace-nowrap text-foreground",
            animate && "anim-logo-word",
          )}
          style={delayStyle(animate, delay + stagger)}
        >
          Albert AI
        </span>
      </>
    ) : (
      <>
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
    variant === "lockup"
      ? cn("inline-flex items-baseline gap-[0.2em] leading-none", lockupSizes[size])
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
