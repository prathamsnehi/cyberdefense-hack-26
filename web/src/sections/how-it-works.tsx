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
      "Before code is written, the coding agent gets a brief: untrusted inputs, minimum permissions, guards to include. Verified sources from Senso.",
  },
  {
    index: "02",
    name: "Detect",
    stack: ["Semgrep"],
    description:
      "Semgrep Guardian runs in the coding agent, plus custom rules for agent flaws, like email text reaching a payment tool.",
  },
  {
    index: "03",
    name: "Prove",
    stack: ["OpenAI", "AkashML"],
    description:
      "An automated attacker hits the agent running isolated in Guild. Open models on AkashML add volume.",
  },
  {
    index: "04",
    name: "Learn",
    stack: ["Semgrep"],
    description:
      "Each successful attack becomes a new rule, swept across every agent in the org and added to the brief.",
  },
  {
    index: "05",
    name: "Watch",
    stack: ["ClickHouse"],
    description:
      "Every agent action is logged with live detections. External email, then a payment to a new account: blocked and alerted. Guild isolates the agent under attack.",
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
          title="Five steps, one stack"
          lede="Each step has one job and one owner in the stack. Together they close the loop from the brief to the live dashboard."
        />

        <div
          aria-hidden="true"
          className="mt-16 hidden gap-8 pb-4 text-eyebrow font-medium uppercase tracking-eyebrow text-fg-muted md:grid md:grid-cols-[5rem_14rem_1fr]"
        >
          <span>Step</span>
          <span>Stack</span>
          <span>What happens</span>
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
              <CardDescription>Attacks run where they cannot spread.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-small text-fg-secondary">
                In step 03 the automated attacker hits the agent running isolated in Guild. In
                step 05, Guild isolates the agent under attack, so one compromised agent does not
                reach the others.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>04 feeds 01</CardTitle>
              <CardDescription>Every successful attack makes the next build safer.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-small text-fg-secondary">
                Each successful attack in step 04 becomes a new rule. That rule is swept across
                every agent in the org and added to the step 01 brief the coding agent reads
                before it writes code.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
