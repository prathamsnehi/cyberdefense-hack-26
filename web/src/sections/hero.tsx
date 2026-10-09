import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Logo } from "@/components/brand/logo";
import { Rule } from "@/components/brand/rule";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/sections/nav";

const STEPS = ["Prevent", "Detect", "Prove", "Learn", "Watch"] as const;
const CYCLE_MS = 1600;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Loop strip with a sequential highlight traveling PREVENT to WATCH.
 * State drives CSS transitions (opacity and transform only), so every change is interruptible.
 * Pauses offscreen, when the tab is hidden, on hover, and is fully static with reduced motion.
 */
function LoopStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const running = !reduced && !hovered && inView && pageVisible;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % STEPS.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <div
      ref={ref}
      className="inline-flex rounded-lg border border-border bg-surface-1/70 px-4 py-3 backdrop-blur-sm sm:px-5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ol aria-label="The Albert AI loop" className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {STEPS.map((step, i) => {
          const isActive = !reduced && i === active;
          const textLit = reduced || isActive;
          const separatorLit = reduced || active === i + 1;

          return (
            <li key={step} className="flex items-center gap-3">
              <span className="relative pb-1 font-display text-title font-semibold uppercase">
                <span className="text-fg-muted">{step}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-0 text-foreground transition-opacity duration-(--duration-base) ease-out",
                    textLit ? "opacity-100" : "opacity-0",
                  )}
                >
                  {step}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent-brand transition-transform duration-(--duration-slow) ease-out",
                    isActive ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="relative font-display text-title font-semibold"
                >
                  <span className="text-fg-muted">{">"}</span>
                  <span
                    className={cn(
                      "absolute left-0 top-0 text-accent-brand transition-[opacity,transform] duration-(--duration-base) ease-out",
                      separatorLit ? "translate-x-0 opacity-100" : "-translate-x-0.5 opacity-0",
                    )}
                  >
                    {">"}
                  </span>
                </span>
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
      className="relative isolate overflow-hidden pb-section-sm pt-20 md:pt-28"
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
        <div className="flex flex-col gap-6">
          <Logo variant="lockup" size="xl" animate delay={0} stagger={50} />
          <div className="anim-fade-up flex items-center gap-3" style={{ animationDelay: "140ms" }}>
            <Rule width="sm" />
            <Eyebrow>Cyberdefense Hackathon #SFTechWeek</Eyebrow>
          </div>
        </div>

        <h1
          id="hero-title"
          className="anim-fade-up max-w-5xl font-display text-display-lg font-bold uppercase text-balance text-foreground"
          style={{ animationDelay: "200ms" }}
        >
          One bad email can take over your agent.
        </h1>

        <p
          className="anim-fade-up max-w-prose text-lede text-pretty text-fg-secondary"
          style={{ animationDelay: "260ms" }}
        >
          Companies are handing AI agents their email, their code and their money. That is
          useful. It also means a single email can steer what the agent does.{" "}
          <span className="font-medium text-foreground">We close the loop.</span>
        </p>

        <div className="anim-fade-up" style={{ animationDelay: "320ms" }}>
          <LoopStrip />
        </div>

        <div
          className="anim-fade-up flex flex-wrap items-center gap-3"
          style={{ animationDelay: "380ms" }}
        >
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
        </div>
      </div>
    </section>
  );
}
