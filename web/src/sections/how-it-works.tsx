import { SectionHeader } from "@/components/brand/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useReveal } from "@/hooks/use-reveal";

interface Step {
  index: string;
  name: string;
  stack: string[];
  description: string;
}

const steps: Step[] = [
  {
    index: "01",
    name: "Prevent",
    stack: ["Senso"],
    description:
      "Verified-source brief. Senso gives the brief verified sources before the coding agent writes any code.",
  },
  {
    index: "02",
    name: "Detect",
    stack: ["Semgrep Guardian"],
    description:
      "Plus custom agent rules. Semgrep Guardian runs in the coding agent with our own rules for agent bugs.",
  },
  {
    index: "03",
    name: "Prove",
    stack: ["OpenAI", "AkashML"],
    description:
      "Attacks run in Guild. OpenAI plus open models on AkashML do the attacking, inside Guild so nothing leaks.",
  },
  {
    index: "04",
    name: "Learn",
    stack: ["Semgrep"],
    description:
      "New rule, swept org-wide. Every attack that worked becomes a Semgrep rule and goes back into the brief.",
  },
  {
    index: "05",
    name: "Watch",
    stack: ["ClickHouse"],
    description:
      "Live detections. ClickHouse logs every agent action and fires the live alerts.",
  },
];

function StepRow({ step, order }: { step: Step; order: number }) {
  const ref = useReveal<HTMLLIElement>();

  return (
    <li
      ref={ref}
      className="reveal grid gap-3 border-t border-hairline py-8 md:grid-cols-[5rem_14rem_1fr] md:items-baseline md:gap-8"
      style={{ transitionDelay: `${order * 60}ms` }}
    >
      <span className="font-display text-display-sm font-bold tabular-nums text-accent-brand">
        {step.index}
      </span>
      <div className="flex flex-col items-start gap-3">
        <h3 className="font-display text-title font-semibold uppercase text-foreground">
          {step.name}
        </h3>
        <ul className="flex flex-wrap gap-2" aria-label={`${step.name} stack`}>
          {step.stack.map((name) => (
            <li key={name}>
              <Badge variant="outline">{name}</Badge>
            </li>
          ))}
        </ul>
      </div>
      <p className="max-w-prose text-body text-pretty text-fg-secondary">{step.description}</p>
    </li>
  );
}

export function HowItWorks() {
  const notesRef = useReveal();

  return (
    <section id="how" aria-labelledby="how-title" className="border-t border-hairline py-section">
      <div className="mx-auto max-w-page px-gutter">
        <SectionHeader
          eyebrow="How it works"
          index="03"
          headingId="how-title"
          title="What runs where"
          lede="Every hit goes back into the brief. Each step has one job and one owner in the Albert AI stack."
        />

        <div
          aria-hidden="true"
          className="mt-16 hidden gap-8 pb-4 text-eyebrow font-medium uppercase tracking-eyebrow text-fg-muted md:grid md:grid-cols-[5rem_14rem_1fr]"
        >
          <span>Step</span>
          <span>Stack</span>
          <span>What it does</span>
        </div>
        <ol className="mt-10 border-b border-hairline md:mt-0">
          {steps.map((step, i) => (
            <StepRow key={step.index} step={step} order={i} />
          ))}
        </ol>

        <div ref={notesRef} className="reveal mt-12 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Isolated by Guild</CardTitle>
              <CardDescription>Attacks run where nothing leaks.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-small text-fg-secondary">
                In step 03, OpenAI plus open models on AkashML attack every fix inside Guild, so
                nothing leaks. If any attack still works, the fix is out.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>04 feeds 01</CardTitle>
              <CardDescription>Every hit makes the next build safer.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-small text-fg-secondary">
                Every attack that works in step 04 becomes a new rule. It is swept org-wide and
                goes back into the step 01 brief, so the next agent starts out knowing about it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
