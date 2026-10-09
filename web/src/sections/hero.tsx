import "@/styles/hero.css";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Rule } from "@/components/brand/rule";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/sections/nav";

const STEPS = ["Prevent", "Detect", "Prove", "Learn", "Watch"] as const;
const CYCLE_MS = 1600;

// Untrusted inputs an agent reads. The headline rotates through them so it does not read as an email-only product.
const THREATS = ["email", "line of code", "web page", "PDF", "pull request", "tool result"] as const;
const THREAT_STATIC = "input";
const THREAT_HOLD_MS = 2400;

const HERO_SIZES = "(min-width: 768px) 70vw, 100vw";
const AVIF_SRCSET = "/hero/torus-640.avif 640w, /hero/torus-960.avif 960w, /hero/torus-1536.avif 1536w";
const WEBP_SRCSET = "/hero/torus-640.webp 640w, /hero/torus-960.webp 960w, /hero/torus-1536.webp 1536w";

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
 * Rotating word in the headline: "One bad <email | line of code | ...>".
 * Every word sits in the same grid cell, so the slot is always as wide as the longest word and the headline
 * never reflows. Each swap rolls the old word out and the new one in, letter by letter (transform, opacity, blur).
 * Pauses offscreen and when the tab is hidden; with reduced motion it is one static word.
 */
function RotatingThreat() {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const [{ active, leaving }, setSlot] = useState<{ active: number; leaving: number | null }>({
    active: 0,
    leaving: null,
  });
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const running = !reduced && inView && pageVisible;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () => setSlot((slot) => ({ active: (slot.active + 1) % THREATS.length, leaving: slot.active })),
      THREAT_HOLD_MS,
    );
    return () => window.clearInterval(id);
  }, [running]);

  if (reduced) {
    return <span className="text-accent-brand">{THREAT_STATIC}</span>;
  }

  return (
    <span ref={ref} className="hero-rotator">
      {THREATS.map((word, w) => (
        <span
          key={word}
          className="hero-rotator-word"
          data-state={w === active ? "active" : w === leaving ? "leaving" : "idle"}
        >
          {Array.from(word).map((char, i) => (
            <span key={i} className="hero-rotator-char" style={{ "--i": i } as React.CSSProperties}>
              {char === " " ? "\u00a0" : char}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
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

/**
 * Background art: glass torus with an orange energy ring.
 * Desktop: anchored right, about 65% of the hero width, behind a left-to-right scrim.
 * Mobile: smaller art block at the top, dimmed, behind a strong vertical scrim.
 */
function HeroArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -right-[18vw] top-14 aspect-[3/2] w-[125vw] opacity-100 md:inset-y-0 md:right-0 md:aspect-auto md:h-full md:w-[65%] md:opacity-100">
        <div className="hero-art-enter h-full w-full">
          <div className="hero-art-drift relative h-full w-full">
            <picture className="block h-full w-full">
              <source type="image/avif" srcSet={AVIF_SRCSET} sizes={HERO_SIZES} />
              <source type="image/webp" srcSet={WEBP_SRCSET} sizes={HERO_SIZES} />
              <img
                src="/hero/torus-960.webp"
                width={1536}
                height={1024}
                alt=""
                aria-hidden="true"
                decoding="async"
                loading="eager"
                fetchPriority="high"
                className="h-full w-full object-cover object-center md:object-[right_center]"
              />
            </picture>
            <div className="hero-glow" />
          </div>
        </div>
      </div>

      <div className="hero-scrim-y absolute inset-0 md:hidden" />
      <div className="hero-scrim-x absolute inset-0 hidden md:block" />
      <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-background to-transparent" />
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="hero-root relative isolate flex flex-col justify-end overflow-hidden pb-section-sm pt-40 sm:pt-56 md:justify-center md:pt-24"
    >
      <HeroArt />

      <div className="mx-auto w-full max-w-page px-gutter">
        <div className="flex flex-col gap-8 md:max-w-[min(60%,44rem)]">
          <div className="anim-fade-up flex items-center gap-3" style={{ animationDelay: "80ms" }}>
            <Rule width="sm" />
            <Eyebrow>Cyberdefense Hackathon #SFTechWeek</Eyebrow>
          </div>

          <h1
            id="hero-title"
            className="anim-fade-up font-display text-display-lg font-bold uppercase text-balance text-foreground"
            style={{ animationDelay: "160ms" }}
          >
            {/* Screen readers get one stable sentence; the animated copy is decorative. */}
            <span className="sr-only">
              One bad email, line of code, web page or document can take over your agent.
            </span>
            <span aria-hidden="true">
              <span className="block">
                One bad <RotatingThreat />
              </span>
              <span className="block">can take over your agent.</span>
            </span>
          </h1>

          <p
            className="anim-fade-up max-w-prose text-lede text-pretty text-fg-secondary"
            style={{ animationDelay: "240ms" }}
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
      </div>
    </section>
  );
}
