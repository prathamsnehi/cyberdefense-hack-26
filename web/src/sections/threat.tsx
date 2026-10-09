import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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

type Beat = "a" | "b" | "c";

interface ChainNode {
  label: string;
  detail: string;
  icon: LucideIcon;
  beat: Beat;
  emphasis?: boolean;
  paid?: boolean;
}

const chain: ChainNode[] = [
  { label: "Inbound email", detail: "Untrusted text from anyone", icon: Mail, beat: "a" },
  {
    label: "AI agent",
    detail: "Reads it as instructions",
    icon: Bot,
    beat: "b",
    emphasis: true,
  },
  {
    label: "Payments tool",
    detail: "Sends money on request",
    icon: Banknote,
    beat: "c",
    paid: true,
  },
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

const START_RATIO = 0.4;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}

function Connector({ wire }: { wire: "a" | "b" }) {
  const PacketIcon = wire === "a" ? Mail : Banknote;

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-3 text-accent-brand md:flex-row md:px-3 md:py-0">
      <span aria-hidden="true" className="relative h-10 w-px bg-hairline-strong md:h-px md:w-16">
        <span
          className={cn("threat-anim threat-wire-fill absolute inset-0 bg-accent-brand", `threat-wire-${wire}`)}
        />
        <span className={cn("threat-anim threat-rail absolute inset-0", `threat-rail-${wire}`)}>
          <span
            className={cn(
              "threat-anim threat-packet absolute left-1/2 top-0 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent-brand text-on-accent md:left-0 md:top-1/2",
              `threat-packet-${wire}`,
            )}
          >
            <PacketIcon className="size-3.5" />
          </span>
        </span>
      </span>
      <ArrowDown aria-hidden="true" className="size-4 md:hidden" />
      <ArrowRight aria-hidden="true" className="hidden size-4 md:block" />
      <span className="sr-only">leads to</span>
    </div>
  );
}

export function Threat() {
  const reduced = usePrefersReducedMotion();
  const documentVisible = useDocumentVisible();
  const chainRef = useRef<HTMLDivElement>(null);
  const flawsRef = useReveal<HTMLUListElement>();

  const [inView, setInView] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const element = chainRef.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInView(entry.isIntersecting);
          if (entry.isIntersecting && entry.intersectionRatio >= START_RATIO) {
            setStarted(true);
          }
        }
      },
      { threshold: [0, START_RATIO] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const mode = reduced ? "static" : started ? "playing" : "idle";
  const paused = mode === "playing" && (!inView || !documentVisible);

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
            <div
              ref={chainRef}
              className={cn(
                "threat-chain grid grid-cols-1 items-stretch md:grid-cols-[1fr_auto_1fr_auto_1fr]",
                `is-${mode}`,
                paused && "is-paused",
              )}
            >
              {chain.map((node, i) => {
                const Icon = node.icon;
                return (
                  <Fragment key={node.label}>
                    <div
                      className={cn(
                        "relative flex flex-col gap-4 rounded-lg border bg-surface-1 p-5",
                        node.emphasis ? "border-accent-brand-border" : "border-border",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "threat-anim threat-glow",
                          `threat-glow-${node.beat}`,
                          node.paid && "threat-glow-strong",
                        )}
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative flex size-9 items-center justify-center rounded-md border bg-surface-2",
                          node.emphasis
                            ? "border-accent-brand-border text-accent-brand"
                            : "border-border text-fg-secondary",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="relative flex flex-col gap-1">
                        <p className="font-display text-title font-semibold uppercase text-foreground">
                          {node.label}
                        </p>
                        <p className="text-small text-muted-foreground">{node.detail}</p>
                      </div>
                      {node.paid ? (
                        <span
                          aria-hidden="true"
                          className="threat-anim threat-paid absolute right-4 top-4 rounded-full bg-accent-brand px-2.5 py-0.5 font-display text-caption font-semibold uppercase tracking-eyebrow text-on-accent"
                        >
                          Paid
                        </span>
                      ) : null}
                    </div>
                    {i < chain.length - 1 ? <Connector wire={i === 0 ? "a" : "b"} /> : null}
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
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-6 bg-accent-brand" />
              <h3 className="font-sans text-eyebrow font-medium uppercase tracking-eyebrow text-muted-foreground">
                New flaw kinds
              </h3>
            </div>
          </Reveal>
          <ul ref={flawsRef} className="reveal reveal-stagger grid grid-cols-1 gap-4 md:grid-cols-3">
            {flaws.map((flaw, i) => (
              <li key={flaw.index} className="h-full" style={{ "--i": i } as CSSProperties}>
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
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
