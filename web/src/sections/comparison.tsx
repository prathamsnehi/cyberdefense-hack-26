import { Check, Minus } from "lucide-react";

import { SectionHeader } from "@/components/brand/section-header";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

type Mark = "yes" | "partial" | null;

const columns = ["Attack tools", "Scan tools", "Monitor tools", "Albert AI"] as const;

interface Row {
  label: string;
  values: [Mark, Mark, Mark, Mark];
}

const rows: Row[] = [
  { label: "Prevent", values: [null, "partial", null, "yes"] },
  { label: "Detect", values: ["partial", "yes", null, "yes"] },
  { label: "Prove", values: ["yes", null, null, "yes"] },
  { label: "Learn", values: ["partial", "partial", null, "yes"] },
  { label: "Watch", values: ["partial", null, "yes", "yes"] },
  { label: "Attack results feed rules and the brief", values: [null, null, null, "yes"] },
];

function Cell({ mark, highlight }: { mark: Mark; highlight: boolean }) {
  if (mark === "yes") {
    return (
      <span className="inline-flex items-center gap-2 text-foreground">
        <Check
          aria-hidden="true"
          className={cn("size-4", highlight ? "text-accent-brand" : "text-fg-secondary")}
        />
        Yes
      </span>
    );
  }
  if (mark === "partial") {
    return (
      <span className="inline-flex items-center gap-2 text-fg-secondary">
        <Minus aria-hidden="true" className="size-4 text-fg-muted" />
        Partial
      </span>
    );
  }
  return (
    <>
      <span aria-hidden="true" className="text-fg-muted">
        ·
      </span>
      <span className="sr-only">Not a main focus</span>
    </>
  );
}

export function Comparison() {
  const ref = useReveal();

  return (
    <section
      id="compare"
      aria-labelledby="compare-title"
      className="border-t border-hairline py-section"
    >
      <div className="mx-auto max-w-page px-gutter">
        <SectionHeader
          eyebrow="Comparison"
          index="05"
          headingId="compare-title"
          title="Separate tools, one loop"
          lede="Existing tools attack, scan, or monitor separately. Albert AI closes the loop."
        />

        <div
          ref={ref}
          role="region"
          aria-labelledby="compare-title"
          tabIndex={0}
          className="reveal mt-16 w-full max-w-full overflow-x-auto rounded-lg border border-hairline [contain:inline-size]"
        >
          <table className="w-full min-w-[40rem] border-collapse text-left text-small">
            <caption className="caption-bottom border-t border-hairline px-4 py-4 text-left text-caption text-fg-muted">
              Columns show each tool category's main focus; some vendors span two.
            </caption>
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="px-4 py-4 font-medium text-fg-muted">
                  <span className="sr-only">Capability</span>
                </th>
                {columns.map((column, i) => {
                  const albert = i === columns.length - 1;
                  return (
                    <th
                      key={column}
                      scope="col"
                      className={cn(
                        "px-4 py-4 font-display text-title font-semibold uppercase",
                        albert ? "bg-accent-brand-subtle text-accent-brand" : "text-foreground",
                      )}
                    >
                      {column}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-hairline last:border-b-0">
                  <th scope="row" className="px-4 py-4 font-medium text-foreground">
                    {row.label}
                  </th>
                  {row.values.map((mark, i) => {
                    const albert = i === row.values.length - 1;
                    return (
                      <td
                        key={columns[i]}
                        className={cn("px-4 py-4", albert && "bg-accent-brand-subtle")}
                      >
                        <Cell mark={mark} highlight={albert} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
