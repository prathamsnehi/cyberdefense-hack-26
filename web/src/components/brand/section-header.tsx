import type { ComponentProps, ReactNode } from "react";

import { Eyebrow } from "@/components/brand/eyebrow";
import { Rule } from "@/components/brand/rule";
import { cn } from "@/lib/utils";

type HeadingLevel = "h1" | "h2" | "h3";

interface SectionHeaderProps extends Omit<ComponentProps<"div">, "title"> {
  eyebrow: string;
  index?: string;
  title: ReactNode;
  lede?: ReactNode;
  as?: HeadingLevel;
  size?: "xl" | "lg" | "md";
  align?: "left" | "center";
  /** Id for the heading, so a section can use aria-labelledby. */
  headingId?: string;
}

const titleSizes = {
  xl: "text-display-xl",
  lg: "text-display-lg",
  md: "text-display-md",
} as const;

/**
 * Eyebrow, accent rule, condensed display heading and optional lede.
 */
export function SectionHeader({
  eyebrow,
  index,
  title,
  lede,
  as: Heading = "h2",
  size = "lg",
  align = "left",
  headingId,
  className,
  ...props
}: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <div
      data-slot="section-header"
      className={cn(
        "flex max-w-3xl flex-col gap-5",
        centered ? "mx-auto items-center text-center" : "items-start text-left",
        className,
      )}
      {...props}
    >
      <Eyebrow index={index}>{eyebrow}</Eyebrow>
      <Rule width="md" />
      <Heading
        id={headingId}
        className={cn(
          "font-display font-bold uppercase text-balance text-foreground",
          titleSizes[size],
        )}
      >
        {title}
      </Heading>
      {lede ? (
        <p className="max-w-2xl text-lede text-pretty text-muted-foreground">{lede}</p>
      ) : null}
    </div>
  );
}
