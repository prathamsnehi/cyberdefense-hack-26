import type { ReactNode } from "react";
import { ArrowRight, GitBranch, ShieldCheck } from "lucide-react";

import { Eyebrow } from "@/components/brand/eyebrow";
import { Rule } from "@/components/brand/rule";
import { SectionHeader } from "@/components/brand/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

const GITHUB_URL = "https://github.com/prathamsnehi/cyberdefense-hack-26";

const swatches = [
  { name: "background", token: "--background", hex: "#0b0b0b", className: "bg-background" },
  { name: "card", token: "--card", hex: "surface", className: "bg-card" },
  { name: "secondary", token: "--secondary", hex: "surface", className: "bg-secondary" },
  { name: "muted", token: "--muted", hex: "surface", className: "bg-muted" },
  { name: "primary", token: "--primary", hex: "#FF4F1F", className: "bg-primary" },
  { name: "accent-brand", token: "--albert-accent", hex: "#FF4F1F", className: "bg-accent-brand" },
] as const;

const typeScale = [
  { name: "display-xl", className: "text-display-xl font-display font-bold uppercase", sample: "Closes the loop" },
  { name: "display-lg", className: "text-display-lg font-display font-bold uppercase", sample: "Prevent. Detect. Prove." },
  { name: "display-md", className: "text-display-md font-display font-bold uppercase", sample: "Learn. Watch." },
  { name: "heading", className: "text-heading font-display font-semibold uppercase", sample: "The agent pays" },
  { name: "title", className: "text-title font-sans font-semibold", sample: "Invoice assistant, attacked and fixed" },
  { name: "body-lg", className: "text-lede font-sans", sample: "Every successful attack makes the next build safer." },
  { name: "body", className: "text-body font-sans", sample: "Existing tools attack, scan, or monitor separately. Albert AI closes the loop." },
  { name: "small", className: "text-small font-sans text-muted-foreground", sample: "Every agent action is logged with live detections." },
  { name: "eyebrow", className: "text-eyebrow font-sans uppercase tracking-eyebrow text-muted-foreground", sample: "Albert AI" },
  { name: "caption", className: "text-caption font-sans text-muted-foreground", sample: "Open models on AkashML add volume." },
] as const;

const loop = [
  { index: "01", step: "Prevent", partner: "Senso" },
  { index: "02", step: "Detect", partner: "Semgrep" },
  { index: "03", step: "Prove", partner: "OpenAI + AkashML" },
  { index: "04", step: "Learn", partner: "Semgrep" },
  { index: "05", step: "Watch", partner: "ClickHouse" },
] as const;

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("reveal", className)}>
      {children}
    </div>
  );
}

function PreviewSection({
  id,
  index,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="border-t border-border py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6">
        <Reveal>
          <SectionHeader
            index={index}
            eyebrow={eyebrow}
            title={title}
            lede={lede}
            size="md"
            headingId={headingId}
          />
        </Reveal>
        <Reveal>{children}</Reveal>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="text-eyebrow font-semibold uppercase tracking-eyebrow text-foreground">
            Albert AI
          </span>
          <Button variant="outline" size="sm" asChild>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <GitBranch aria-hidden="true" />
              GitHub
            </a>
          </Button>
        </div>
      </header>

      <main>
        <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-grid fade-edges">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-32">
            <Reveal>
              <SectionHeader
                as="h1"
                size="xl"
                index="00"
                eyebrow="Design system preview"
                headingId="hero-heading"
                title="Albert AI closes the loop."
                lede="One malicious email can take control of an AI agent with access to email, code and money. Albert AI closes the loop."
              />
            </Reveal>
            <Reveal className="flex flex-wrap gap-3">
              <Button size="lg">
                See the demo
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  View the repo
                </a>
              </Button>
            </Reveal>
          </div>
        </section>

        <PreviewSection
          id="color"
          index="01"
          eyebrow="Color"
          title="Near-black, white, one accent"
          lede="Surfaces and text come from semantic tokens. The accent is used sparingly: rules, indexes, primary actions."
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {swatches.map((swatch) => (
              <div key={swatch.name} className="flex flex-col gap-3">
                <div className={cn("h-20 rounded-md border border-border", swatch.className)} />
                <div className="flex flex-col gap-1">
                  <span className="text-small font-medium text-foreground">{swatch.name}</span>
                  <span className="text-caption text-muted-foreground">
                    {swatch.token} / {swatch.hex}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-10" />
          <div className="flex flex-col gap-3">
            <p className="text-body text-foreground">Foreground: primary text on background.</p>
            <p className="text-body text-muted-foreground">Muted foreground: secondary text, ledes, captions.</p>
            <p className="text-heading font-display font-semibold uppercase text-accent-brand">
              Accent text: large sizes only
            </p>
          </div>
        </PreviewSection>

        <PreviewSection id="type" index="02" eyebrow="Typography" title="Oswald display, Inter body">
          <div className="flex flex-col">
            {typeScale.map((row) => (
              <div
                key={row.name}
                className="grid grid-cols-1 items-baseline gap-2 border-b border-border py-6 md:grid-cols-[10rem_1fr]"
              >
                <span className="text-caption text-muted-foreground">{row.name}</span>
                <span className={row.className}>{row.sample}</span>
              </div>
            ))}
          </div>
        </PreviewSection>

        <PreviewSection id="buttons" index="03" eyebrow="Buttons" title="Actions">
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Continue">
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection id="badges" index="04" eyebrow="Badges" title="Status and labels">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Blocked</Badge>
            <Badge variant="secondary">Semgrep</Badge>
            <Badge variant="outline">ClickHouse</Badge>
            <Badge variant="destructive">Rejected</Badge>
          </div>
        </PreviewSection>

        <PreviewSection id="cards" index="05" eyebrow="Cards" title="The loop">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {loop.map((item) => (
                <Card key={item.index}>
                  <CardHeader>
                    <Eyebrow index={item.index}>{item.partner}</Eyebrow>
                    <CardTitle className="font-display text-heading font-bold uppercase">
                      {item.step}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Card className="max-w-xl">
              <CardHeader>
                <Eyebrow index="0:40">Prove the fix</Eyebrow>
                <CardTitle className="text-title">Albert flags the flaw and proposes a fix.</CardTitle>
                <CardDescription>
                  50 attack variants, 3 still work: rejected. Second fix, 0 work: accepted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Rule width="full" thickness="hairline" />
              </CardContent>
              <CardFooter className="flex items-center gap-2 text-small text-muted-foreground">
                <ShieldCheck aria-hidden="true" className="size-4 text-accent-brand" />
                Every successful attack makes the next build safer.
              </CardFooter>
            </Card>
          </div>
        </PreviewSection>

        <PreviewSection id="primitives" index="06" eyebrow="Brand primitives" title="Eyebrow and rule">
          <div className="flex flex-col gap-8">
            <Eyebrow>Albert AI</Eyebrow>
            <Eyebrow index="02">The threat</Eyebrow>
            <div className="flex flex-col gap-4">
              <Rule width="xs" />
              <Rule width="sm" />
              <Rule width="md" />
              <Rule width="lg" thickness="heavy" />
              <Rule width="full" thickness="hairline" />
            </div>
          </div>
        </PreviewSection>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 text-caption text-muted-foreground md:flex-row md:justify-between">
          <span>Albert AI. Cyberdefense Hackathon #SFTechWeek, AWS Builder Loft SF.</span>
          <span>Luigi Canoro, Pratham Snehi, Leandro</span>
        </div>
      </footer>
    </div>
  );
}
