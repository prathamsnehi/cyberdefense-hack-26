import { SectionHeader } from "@/components/brand/section-header";
import { Rule } from "@/components/brand/rule";
import { useReveal } from "@/hooks/use-reveal";

interface Member {
  name: string;
  initials: string;
  handle?: string;
}

const members: Member[] = [
  { name: "Luigi Canoro", initials: "LC" },
  { name: "Pratham Snehi", initials: "PS" },
  { name: "Leandro", initials: "L", handle: "@leandrodenos" },
];

function MemberCard({ member, order }: { member: Member; order: number }) {
  const ref = useReveal<HTMLLIElement>();

  return (
    <li
      ref={ref}
      className="reveal flex flex-col gap-6 rounded-lg border border-hairline bg-surface-1 p-6"
      style={{ transitionDelay: `${order * 70}ms` }}
    >
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full border border-accent-brand-border bg-accent-brand-subtle font-display text-display-sm font-bold text-accent-brand"
      >
        {member.initials}
      </span>
      <div className="flex flex-col gap-2">
        <Rule width="xs" />
        <h3 className="font-display text-title font-semibold uppercase text-foreground">
          {member.name}
        </h3>
        {member.handle ? (
          <p className="font-mono text-small text-fg-secondary">{member.handle}</p>
        ) : null}
      </div>
    </li>
  );
}

export function Team() {
  return (
    <section id="team" aria-labelledby="team-title" className="border-t border-hairline py-section">
      <div className="mx-auto max-w-page px-gutter">
        <SectionHeader eyebrow="Team" index="06" headingId="team-title" title="Built by" />
        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member, i) => (
            <MemberCard key={member.name} member={member} order={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
