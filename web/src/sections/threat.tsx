import { Fragment } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, Banknote, Bot, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ChainNode {
  label: string;
  detail: string;
  icon: LucideIcon;
  emphasis?: boolean;
}

const chain: ChainNode[] = [
  { label: "Inbound email", detail: "Untrusted text from anyone", icon: Mail },
  { label: "AI agent", detail: "Reads it as instructions", icon: Bot, emphasis: true },
  { label: "Payments tool", detail: "Sends money on request", icon: Banknote },
];

const flaws = [
  {
    index: "01",
    title: "Untrusted input steers it",
    description: "An inbound email becomes a command.",
  },
  {
    index: "02",
    title: "Over-permissioned agents",
    description: "More access than the task needs.",
  },
  {
    index: "03",
    title: "Agents sharing a runtime",
    description: "One compromised agent reaches the others.",
  },
] as const;

function Connector() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 py-2 text-accent-brand md:flex-row md:px-3 md:py-0"
    >
      <span aria-hidden="true" className="h-6 w-px bg-accent-brand-border md:h-px md:w-8" />
      <ArrowDown aria-hidden="true" className="size-4 md:hidden" />
      <ArrowRight aria-hidden="true" className="hidden size-4 md:block" />
      <span className="sr-only">leads to</span>
    </div>
  );
}

export function Threat() {
  return (
    <section id="threat" aria-labelledby="threat-title" className="border-t border-border py-section">
      <div className="mx-auto flex w-full max-w-page flex-col gap-14 px-gutter">
        <Reveal>
          <SectionHeader
            eyebrow="The threat"
            index="01"
            headingId="threat-title"
            title="The attacker writes the instructions"
            lede="AI agents read untrusted text and act on it with real access to email, code and money."
          />
        </Reveal>

        <Reveal delay={80}>
          <figure className="flex flex-col gap-6">
            <div className="grid grid-cols-1 items-stretch md:grid-cols-[1fr_auto_1fr_auto_1fr]">
              {chain.map((node, i) => {
                const Icon = node.icon;
                return (
                  <Fragment key={node.label}>
                    <div
                      className={cn(
                        "flex flex-col gap-4 rounded-lg border bg-surface-1 p-5",
                        node.emphasis ? "border-accent-brand-border" : "border-border",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-9 items-center justify-center rounded-md border bg-surface-2",
                          node.emphasis
                            ? "border-accent-brand-border text-accent-brand"
                            : "border-border text-fg-secondary",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <p className="font-display text-title font-semibold uppercase text-foreground">
                          {node.label}
                        </p>
                        <p className="text-small text-muted-foreground">{node.detail}</p>
                      </div>
                    </div>
                    {i < chain.length - 1 ? <Connector /> : null}
                  </Fragment>
                );
              })}
            </div>
            <figcaption className="max-w-prose text-body text-fg-secondary">
              <span className="font-medium text-foreground">Prompt injection:</span> the attacker
              writes the instructions, the agent pays.
            </figcaption>
          </figure>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal>
            <h3 className="font-sans text-eyebrow font-medium uppercase tracking-eyebrow text-muted-foreground">
              New flaw kinds
            </h3>
          </Reveal>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {flaws.map((flaw, i) => (
              <li key={flaw.index}>
                <Reveal delay={i * 80} className="h-full">
                  <Card className="h-full transition-colors duration-(--duration-base) ease-out hover:border-hairline-strong">
                    <CardHeader>
                      <span
                        aria-hidden="true"
                        className="font-display text-display-sm font-bold tabular-nums text-accent-brand"
                      >
                        {flaw.index}
                      </span>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <CardTitle>
                        <span className="sr-only">{flaw.index}. </span>
                        {flaw.title}
                      </CardTitle>
                      <CardDescription className="text-body text-fg-secondary">
                        {flaw.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
