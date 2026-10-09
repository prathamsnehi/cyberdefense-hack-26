import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { SectionHeader } from "@/components/brand/section-header";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const steps = [
  {
    index: "01",
    name: "Prevent",
    stack: "Senso",
    description: "Before code is written, the coding agent gets a brief from verified sources.",
  },
  {
    index: "02",
    name: "Detect",
    stack: "Semgrep",
    description: "Semgrep Guardian runs in the coding agent, plus custom rules for agent flaws.",
  },
  {
    index: "03",
    name: "Prove",
    stack: "OpenAI + AkashML",
    description: "An automated attacker hits the agent running isolated in Guild.",
  },
  {
    index: "04",
    name: "Learn",
    stack: "Semgrep",
    description: "Each successful attack becomes a new rule, swept across every agent.",
  },
  {
    index: "05",
    name: "Watch",
    stack: "ClickHouse",
    description: "Every agent action is logged with live detections.",
  },
] as const;

export function Loop() {
  return (
    <section id="loop" aria-labelledby="loop-title" className="border-t border-border py-section">
      <div className="mx-auto flex w-full max-w-page flex-col gap-14 px-gutter">
        <Reveal>
          <SectionHeader
            eyebrow="The loop"
            index="02"
            headingId="loop-title"
            title="Every successful attack makes the next build safer."
            lede="Prevent, detect, prove, learn, watch. Five stages that feed each other."
          />
        </Reveal>

        <ol className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {steps.map((step, i) => (
            <li key={step.index}>
              <Reveal delay={i * 80} className="group flex h-full flex-col gap-5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-accent-brand-border bg-accent-brand-subtle font-display text-small font-semibold tabular-nums text-accent-brand transition-colors duration-(--duration-base) ease-out group-hover:bg-accent-brand group-hover:text-on-accent"
                  >
                    {step.index}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-px flex-1 bg-accent-brand-border",
                      i === steps.length - 1 && "lg:bg-border",
                    )}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-display-sm font-bold uppercase text-foreground">
                    <span className="sr-only">Step {step.index}: </span>
                    {step.name}
                  </h3>
                  <p className="text-caption font-medium uppercase tracking-eyebrow text-fg-secondary">
                    {step.stack}
                  </p>
                  <p className="text-small text-pretty text-muted-foreground">{step.description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal delay={80}>
          <div className="flex items-start gap-4 rounded-lg border border-border bg-surface-1 p-5 sm:items-center">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-accent-brand-border bg-accent-brand-subtle text-accent-brand"
            >
              <RotateCcw className="size-4" />
            </span>
            <p className="text-body text-fg-secondary">
              <span className="font-medium text-foreground">Learn feeds Prevent.</span> Attack
              results become new rules and are added to the brief for the next build.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
