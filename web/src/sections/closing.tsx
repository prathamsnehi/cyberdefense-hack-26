import { ArrowUpRight } from "lucide-react";

import { Eyebrow } from "@/components/brand/eyebrow";
import { Rule } from "@/components/brand/rule";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useReveal } from "@/hooks/use-reveal";

const GITHUB_URL = "https://github.com/prathamsnehi/cyberdefense-hack-26";
const loop = ["Prevent", "Detect", "Prove", "Learn", "Watch"];
const stack = ["Senso", "Semgrep", "OpenAI", "AkashML", "Guild", "ClickHouse"];

export function Closing() {
  const ref = useReveal();

  return (
    <section
      id="closing"
      aria-labelledby="closing-title"
      className="relative overflow-hidden border-t border-hairline py-section"
    >
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      />
      <div
        ref={ref}
        className="reveal relative mx-auto flex max-w-page flex-col items-center gap-6 px-gutter text-center"
      >
        <Eyebrow>Albert AI</Eyebrow>
        <Rule width="md" />
        <h2
          id="closing-title"
          className="max-w-4xl font-display text-display-lg font-bold uppercase text-balance"
        >
          <span className="block text-fg-secondary">
            Existing tools attack, scan, or monitor separately.
          </span>
          <span className="block text-foreground">
            Albert AI <span className="text-accent-brand">closes the loop.</span>
          </span>
        </h2>
        <ol
          aria-label="The loop"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-eyebrow font-medium uppercase tracking-eyebrow text-fg-muted"
        >
          {loop.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              {i > 0 ? (
                <span aria-hidden="true" className="h-px w-4 bg-accent-brand" />
              ) : null}
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              View on GitHub
              <ArrowUpRight aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#demo">Watch the demo</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-page flex-col gap-8 px-gutter py-section-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <a
            href="#top"
            className="flex items-center gap-3 rounded-sm text-eyebrow font-semibold uppercase tracking-eyebrow text-foreground"
          >
            <Rule width="xs" />
            Albert AI
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-sm text-small text-fg-secondary transition-colors duration-(--duration-fast) ease-out hover:text-foreground"
          >
            GitHub
            <ArrowUpRight aria-hidden="true" className="size-4" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 text-small text-fg-muted md:flex-row md:items-start md:justify-between">
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <span>Cyberdefense Hackathon #SFTechWeek by {"tokens&"}</span>
            <span aria-hidden="true">|</span>
            <span>AWS Builder Loft SF</span>
            <span aria-hidden="true">|</span>
            <span>Oct 9, 2026</span>
          </p>
          <p>Built with {stack.join(", ")}.</p>
        </div>
      </div>
    </footer>
  );
}
