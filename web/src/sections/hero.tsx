import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUpRight, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Rule } from "@/components/brand/rule";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/sections/nav";

const STEPS = ["Prevent", "Detect", "Prove", "Learn", "Watch"] as const;
const CYCLE_MS = 1800;

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

function LoopStrip() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    let id: number | undefined;

    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    const start = () => {
      stop();
      if (mql.matches || paused) return;
      id = window.setInterval(() => setActive((i) => (i + 1) % STEPS.length), CYCLE_MS);
    };

    start();
    mql.addEventListener("change", start);
    return () => {
      stop();
      mql.removeEventListener("change", start);
    };
  }, [paused]);

  return (
    <div
      className="inline-flex rounded-lg border border-border bg-surface-1/70 px-4 py-3 backdrop-blur-sm sm:px-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <ol aria-label="The Albert AI loop" className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        {STEPS.map((step, i) => {
          const isActive = i === active;
          return (
            <li key={step} className="flex items-center gap-2.5">
              <span
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "relative pb-1 font-display text-title font-semibold uppercase transition-colors duration-(--duration-base) ease-out",
                  isActive ? "text-foreground" : "text-fg-muted",
                )}
              >
                {step}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent-brand transition-[opacity,transform] duration-(--duration-base) ease-out",
                    isActive ? "scale-x-100 opacity-100" : "scale-x-75 opacity-0",
                  )}
                />
              </span>
              {i < STEPS.length - 1 ? (
                <ChevronRight aria-hidden="true" className="size-4 text-fg-muted" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden pb-section-sm pt-20 md:pt-32"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute left-1/2 top-0 h-96 w-[48rem] max-w-full -translate-x-1/2 bg-radial from-accent-brand-subtle to-transparent to-70%" />
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-background to-transparent" />
        <div className="absolute inset-y-0 left-0 hidden w-32 bg-linear-to-r from-background to-transparent md:block" />
        <div className="absolute inset-y-0 right-0 hidden w-32 bg-linear-to-l from-background to-transparent md:block" />
      </div>

      <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-gutter">
        <Reveal className="flex flex-col gap-5">
          <Rule width="sm" />
          <Eyebrow>Cyberdefense Hackathon #SFTechWeek</Eyebrow>
        </Reveal>

        <Reveal delay={80}>
          <h1
            id="hero-title"
            className="max-w-5xl font-display text-display-xl font-bold uppercase text-balance text-foreground"
          >
            One malicious email can take control of an AI agent
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="max-w-prose text-lede text-pretty text-fg-secondary">
            with access to email, code and money.{" "}
            <span className="font-medium text-foreground">Albert AI closes the loop.</span>
          </p>
        </Reveal>

        <Reveal delay={240}>
          <LoopStrip />
        </Reveal>

        <Reveal delay={320} className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <a href="#loop">
              See the loop
              <ArrowDown aria-hidden="true" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              View on GitHub
              <ArrowUpRight aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
