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
  { label: "Brief before code", values: [null, "partial", null, "yes"] },
  { label: "Rules while it writes", values: ["partial", "yes", null, "yes"] },
  { label: "Attack every fix", values: ["yes", null, null, "yes"] },
  { label: "Attack becomes a rule", values: ["partial", "partial", null, "yes"] },
  { label: "Live detection", values: ["partial", null, "yes", "yes"] },
  { label: "Each step feeds the next", values: [null, null, null, "yes"] },
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
          title="Pieces vs. a loop"
          lede="Attack tools, scanners and monitors are good at their piece, and they run separately. Albert AI wires it all into one loop."
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
              Columns show each category's main focus. Some vendors span two.
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
