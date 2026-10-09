import * as React from "react";

import { cn } from "@/lib/utils";

type SeparatorProps = React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  const semantic = decorative
    ? { role: "none" as const }
    : { role: "separator" as const, "aria-orientation": orientation };

  return (
    <div
      data-slot="separator"
      data-orientation={orientation}
      {...semantic}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
export type { SeparatorProps };
