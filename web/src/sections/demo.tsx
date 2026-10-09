import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { SectionHeader } from "@/components/brand/section-header";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

type Tone = "default" | "muted" | "danger" | "accent";

interface Line {
  tag: string;
  text: string;
  tone: Tone;
}

interface Beat {
  time: string;
  title: string;
  summary: string;
  status: { label: string; variant: BadgeProps["variant"] };
  lines: Line[];
}

const beats: Beat[] = [
  {
    time: "0:00",
    title: "Break it",
    summary: "Bad email. It pays. The invoice assistant reads one bad email as orders and sends the money.",
    status: { label: "Compromised", variant: "destructive" },
    lines: [
      { tag: "build", text: "invoice assistant: pays invoices from email", tone: "muted" },
      { tag: "inbox", text: "inbound email: anyone can write it", tone: "default" },
      { tag: "agent", text: "reads the email as orders", tone: "default" },
      { tag: "pay", text: "payments tool sends the money", tone: "danger" },
      { tag: "result", text: "one bad email, the agent pays", tone: "danger" },
    ],
  },
  {
    time: "0:08",
    title: "Prove the fix",
    summary: "Fix 1: 3/50 land. Out. Fix 2: 0/50. Accepted.",
    status: { label: "Accepted", variant: "default" },
    lines: [
      { tag: "albert", text: "fix proposed, attacked in Guild", tone: "accent" },
      { tag: "fix 1", text: "3/50 attacks land", tone: "danger" },
      { tag: "result", text: "fix 1 is out", tone: "danger" },
      { tag: "fix 2", text: "0/50 attacks land", tone: "default" },
      { tag: "result", text: "fix 2 accepted", tone: "accent" },
    ],
  },
  {
    time: "0:18",
    title: "Learn",
    summary: "New rule finds the same bug in another agent.",
    status: { label: "Rule added", variant: "default" },
    lines: [
      { tag: "rule", text: "the attack that worked becomes a new rule", tone: "accent" },
      { tag: "sweep", text: "rule swept org-wide with Semgrep", tone: "default" },
      { tag: "match", text: "same bug found in another agent", tone: "danger" },
      { tag: "brief", text: "rule goes back into the brief for the next build", tone: "accent" },
    ],
  },
  {
    time: "0:24",
    title: "Watch",
    summary: "Live attack blocked in ClickHouse.",
    status: { label: "Blocked", variant: "default" },
    lines: [
      { tag: "event", text: "inbound email received by the agent", tone: "default" },
      { tag: "event", text: "payment requested by the email", tone: "default" },
      { tag: "log", text: "every agent action logged in ClickHouse", tone: "muted" },
      { tag: "detect", text: "live detection fires in ClickHouse", tone: "accent" },
      { tag: "action", text: "live attack blocked", tone: "accent" },
    ],
  },
];

const toneClass: Record<Tone, string> = {
  default: "text-foreground",
  muted: "text-fg-muted",
  danger: "text-destructive",
  accent: "text-accent-brand",
};

export function Demo() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const revealRef = useReveal();

  function select(index: number) {
    const next = (index + beats.length) % beats.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        select(active + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        select(active - 1);
        break;
      case "Home":
        event.preventDefault();
        select(0);
        break;
      case "End":
        event.preventDefault();
        select(beats.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <section id="demo" aria-labelledby="demo-title" className="border-t border-hairline py-section">
      <div className="mx-auto max-w-page px-gutter">
        <SectionHeader
          eyebrow="Demo"
          index="04"
          headingId="demo-title"
          title="Demo, 30 sec"
          lede="Invoice assistant. One bad email. It pays. Then Albert AI proves a fix, learns a rule and blocks the live attack. Pick a moment to see what happens."
        />

        <div ref={revealRef} className="reveal mt-16 grid gap-6 lg:grid-cols-[18rem_1fr]">
          <div
            role="tablist"
            aria-label="Demo timeline"
            onKeyDown={onKeyDown}
            className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:content-start"
          >
            {beats.map((beat, i) => {
              const selected = i === active;
              return (
                <button
                  key={beat.time}
                  ref={(node) => {
                    tabRefs.current[i] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`demo-tab-${i}`}
                  aria-selected={selected}
                  aria-controls={`demo-panel-${i}`}
                  tabIndex={selected ? 0 : -1}
                  aria-hidden={!selected}
                  onClick={() => setActive(i)}
                  className={cn(
                    "relative flex flex-col items-start gap-1 overflow-hidden rounded-md border px-4 py-3 text-left",
                    "transition-[transform,background-color,border-color] duration-(--duration-fast) ease-out",
                    "active:scale-[0.97] motion-reduce:active:scale-100",
                    selected
                      ? "border-hairline-strong bg-surface-2"
                      : "border-hairline bg-transparent hover:bg-surface-1",
                  )}
                >
                  <span className="font-mono text-caption tabular-nums text-accent-brand">
                    {beat.time}
                  </span>
                  <span className="font-display text-title font-semibold uppercase text-foreground">
                    {beat.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-0.5 bg-accent-brand transition-opacity duration-(--duration-base) ease-out",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div className="grid">
            {beats.map((beat, i) => {
              const selected = i === active;
              return (
                <div
                  key={beat.time}
                  role="tabpanel"
                  id={`demo-panel-${i}`}
                  aria-labelledby={`demo-tab-${i}`}
                  tabIndex={selected ? 0 : -1}
                  className={cn(
                    "col-start-1 row-start-1 flex flex-col rounded-lg border border-hairline bg-surface-1",
                    "transition-[opacity,filter,translate,visibility] duration-(--duration-base) ease-out",
                    "motion-reduce:translate-y-0 motion-reduce:blur-none",
                    selected
                      ? "visible translate-y-0 opacity-100 blur-none"
                      : "pointer-events-none invisible translate-y-1 opacity-0 blur-[2px]",
                  )}
                >
                  <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex gap-1.5">
                        <span className="size-2.5 rounded-full bg-surface-3" />
                        <span className="size-2.5 rounded-full bg-surface-3" />
                        <span className="size-2.5 rounded-full bg-surface-3" />
                      </span>
                      <span className="font-mono text-caption text-fg-muted">
                        invoice-assistant / {beat.time}
                      </span>
                    </div>
                    <Badge variant={beat.status.variant}>{beat.status.label}</Badge>
                  </div>

                  <p className="border-b border-hairline px-4 py-4 text-small text-pretty text-fg-secondary sm:px-6">
                    {beat.summary}
                  </p>

                  <ol className="flex flex-col gap-2 overflow-x-auto px-4 py-5 font-mono text-small sm:px-6">
                    {beat.lines.map((line, j) => (
                      <li key={`${line.tag}-${j}`} className="flex gap-4">
                        <span className="w-14 shrink-0 text-fg-muted">{line.tag}</span>
                        <span className={toneClass[line.tone]}>{line.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
