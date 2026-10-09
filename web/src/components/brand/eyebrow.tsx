import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

interface EyebrowProps extends ComponentProps<"p"> {
  /** Optional slide-style index, for example "02". Rendered in the accent color. */
  index?: string;
}

/**
 * Small, letter-spaced, uppercase label used above headings.
 * Mirrors the "ALBERT AI" and "01" markers from the deck.
 */
export function Eyebrow({ index, className, children, ...props }: EyebrowProps) {
  return (
    <p
      data-slot="eyebrow"
      className={cn(
        "flex items-center gap-3 font-sans text-eyebrow font-medium uppercase tracking-eyebrow text-muted-foreground",
        className,
      )}
      {...props}
    >
      {index ? (
        <>
          <span className="tabular-nums text-accent-brand">{index}</span>
          <span aria-hidden="true" className="h-px w-6 bg-border" />
        </>
      ) : null}
      <span>{children}</span>
    </p>
  );
}
