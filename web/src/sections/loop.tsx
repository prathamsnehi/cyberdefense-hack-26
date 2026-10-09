import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { Logo } from "@/components/brand/logo";
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

type Step = (typeof steps)[number];

/* Timing */
const STEP_MS = 1600;
const INTRO_MS = 1800;
const ENTER_RATIO = 0.25;

/* Geometry in a 0..100 square, matching the stage in percent */
const CENTER = 50;
const RADIUS = 36;
const SLICE = 360 / steps.length;
const CARD_WIDTH = "28%";
const CHEVRON = "M -0.9 -1.3 L 0.7 0 L -0.9 1.3";

function round(value: number): number {
  return Number(value.toFixed(3));
}

/* Angle 0 is the top of the circle, increasing clockwise. */
function polar(angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: round(CENTER + RADIUS * Math.sin(rad)),
    y: round(CENTER - RADIUS * Math.cos(rad)),
  };
}

const cardPositions = steps.map((_, i) => polar(i * SLICE));

const arrows = steps.map((_, i) => {
  const startAngle = i * SLICE;
  const start = polar(startAngle);
  const end = polar(startAngle + SLICE);
  const midAngle = startAngle + SLICE / 2;
  const mid = polar(midAngle);
  return {
    d: `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`,
    chevron: `translate(${mid.x} ${mid.y}) rotate(${round(midAngle)})`,
  };
});

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

interface StepCardProps {
  step: Step;
  position: number;
  active: boolean;
  showIndex: boolean;
  onEnter: (position: number) => void;
  onLeave: (position: number) => void;
}

function StepCard({ step, position, active, showIndex, onEnter, onLeave }: StepCardProps) {
  return (
    <div
      tabIndex={0}
      onMouseEnter={() => onEnter(position)}
      onMouseLeave={() => onLeave(position)}
      onFocus={() => onEnter(position)}
      onBlur={() => onLeave(position)}
      style={{ "--i": position } as CSSProperties}
      className={cn(
        "loop-card relative flex flex-col gap-1.5 rounded-lg border border-border bg-surface-1 p-4",
        active && "is-active",
      )}
    >
      {showIndex ? (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="font-display text-title font-bold tabular-nums text-accent-brand"
          >
            {step.index}
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-accent-brand-border" />
        </div>
      ) : null}
      <h3 className="font-display text-title font-bold uppercase text-foreground">
        <span className="sr-only">Step {step.index}: </span>
        {step.name}
      </h3>
      <p className="text-caption font-medium uppercase tracking-eyebrow text-fg-secondary">
        {step.stack}
      </p>
      <p className="text-caption text-pretty text-muted-foreground">{step.description}</p>
    </div>
  );
}

export function Loop() {
  const reduced = usePrefersReducedMotion();
  const documentVisible = useDocumentVisible();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [inView, setInView] = useState(false);
  const [entered, setEntered] = useState(false);
  const [running, setRunning] = useState(false);
  const [cursor, setCursor] = useState({ step: 0, cycle: 0 });
  const [pinned, setPinned] = useState<number | null>(null);

  /* Visibility: drives the intro once and pauses the loop offscreen. */
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      setEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInView(entry.isIntersecting);
          if (
            entry.isIntersecting &&
            (entry.intersectionRatio >= ENTER_RATIO ||
              entry.boundingClientRect.top < window.innerHeight * 0.6)
          ) {
            setEntered(true);
          }
        }
      },
      { threshold: [0, 0.05, 0.1, 0.2, ENTER_RATIO] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* Intro finishes, then the loop starts. */
  useEffect(() => {
    if (!entered || reduced || running) return;
    const timer = window.setTimeout(() => setRunning(true), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [entered, reduced, running]);

  const playing = running && !reduced && inView && documentVisible && pinned === null;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCursor((current) => {
        const step = (current.step + 1) % steps.length;
        return { step, cycle: step === 0 ? current.cycle + 1 : current.cycle };
      });
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  const activeIndex = pinned ?? (running && !reduced ? cursor.step : -1);

  const handleEnter = (position: number) => setPinned(position);
  const handleLeave = (position: number) => {
    setPinned(null);
    setCursor((current) => ({ ...current, step: position }));
  };

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

        <div
          ref={wrapperRef}
          className={cn(
            "loop-motion",
            (entered || reduced) && "is-entered",
            running && !reduced && "is-running",
          )}
        >
          {/* md and up: circular stage */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-3xl md:block">
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 100 100"
              fill="none"
              className="pointer-events-none absolute inset-0 size-full overflow-visible"
            >
              {arrows.map((arrow, i) => (
                <g
                  key={steps[i].index}
                  className={cn("loop-arrow", activeIndex === i && "is-active")}
                  style={{ "--i": i } as CSSProperties}
                >
                  <path d={arrow.d} pathLength={1} className="loop-arrow-base" />
                  <path d={arrow.d} pathLength={1} className="loop-arrow-fill" />
                  <path d={arrow.d} pathLength={1} className="loop-arrow-dot" />
                  <g className="loop-chevron" transform={arrow.chevron}>
                    <path d={CHEVRON} className="loop-chevron-base" />
                    <path d={CHEVRON} className="loop-chevron-fill" />
                  </g>
                </g>
              ))}
            </svg>

            <div aria-hidden="true" className="loop-oval-frame">
              <div className="loop-oval relative flex size-full flex-col items-center justify-center gap-2 border border-accent-brand-border bg-albert-black">
                {!reduced && cursor.cycle > 0 ? (
                  <span key={cursor.cycle} className="loop-oval-pulse" />
                ) : null}
                <Logo variant="lockup" size="sm" />
                <p className="text-caption font-medium uppercase tracking-eyebrow text-fg-secondary">
                  closes the loop
                </p>
              </div>
            </div>

            <ol aria-label="The Albert AI loop. Step 05 leads back to step 01." className="absolute inset-0">
              {steps.map((step, i) => (
                <li
                  key={step.index}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${cardPositions[i].x}%`,
                    top: `${cardPositions[i].y}%`,
                    width: CARD_WIDTH,
                  }}
                >
                  <StepCard
                    step={step}
                    position={i}
                    active={activeIndex === i}
                    showIndex
                    onEnter={handleEnter}
                    onLeave={handleLeave}
                  />
                </li>
              ))}
            </ol>
          </div>

          {/* Below md: vertical list with a progressing rail */}
          <ol
            aria-label="The Albert AI loop. Step 05 leads back to step 01."
            className="flex flex-col md:hidden"
          >
            {steps.map((step, i) => (
              <li key={step.index} className="relative flex gap-4 pb-6 last:pb-0">
                {i < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 left-5 top-12 w-px -translate-x-1/2 bg-hairline-strong"
                  >
                    <span
                      className={cn(
                        "loop-rail-fill absolute inset-0 bg-accent-brand",
                        activeIndex > i && "is-filled",
                      )}
                    />
                  </span>
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    "loop-node relative flex size-10 shrink-0 items-center justify-center rounded-full border border-accent-brand-border bg-albert-black font-display text-small font-semibold tabular-nums text-accent-brand",
                    activeIndex === i && "is-active",
                  )}
                >
                  {step.index}
                </span>
                <div className="min-w-0 flex-1">
                  <StepCard
                    step={step}
                    position={i}
                    active={activeIndex === i}
                    showIndex={false}
                    onEnter={handleEnter}
                    onLeave={handleLeave}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Reveal delay={80}>
          <div className="flex items-start gap-4 rounded-lg border border-border bg-surface-1 p-5 sm:items-center">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-accent-brand-border bg-accent-brand-subtle text-accent-brand"
            >
              <RotateCcw className="size-4" />
            </span>
            <p className="text-body text-fg-secondary">
              Each successful attack in{" "}
              <span className="font-display font-semibold tabular-nums text-accent-brand">04</span>{" "}
              goes back into the{" "}
              <span className="font-display font-semibold tabular-nums text-accent-brand">01</span>{" "}
              brief as a rule.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
