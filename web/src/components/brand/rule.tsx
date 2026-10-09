import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const widths = {
  xs: "w-6",
  sm: "w-10",
  md: "w-16",
  lg: "w-24",
  full: "w-full",
} as const;

const thicknesses = {
  hairline: "h-px",
  bar: "h-0.5",
  heavy: "h-1",
} as const;

export type RuleWidth = keyof typeof widths;
export type RuleThickness = keyof typeof thicknesses;

interface RuleProps extends ComponentProps<"div"> {
  width?: RuleWidth;
  thickness?: RuleThickness;
}

/**
 * Thin horizontal accent bar from the deck. Decorative only.
 */
export function Rule({ width = "md", thickness = "bar", className, ...props }: RuleProps) {
  return (
    <div
      data-slot="rule"
      role="presentation"
      aria-hidden="true"
      className={cn("shrink-0 bg-accent-brand", widths[width], thicknesses[thickness], className)}
      {...props}
    />
  );
}
