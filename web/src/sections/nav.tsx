import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const GITHUB_URL = "https://github.com/prathamsnehi/cyberdefense-hack-26";

const links = [
  { href: "#loop", label: "Loop" },
  { href: "#how", label: "How it works" },
  { href: "#demo", label: "Demo" },
  { href: "#team", label: "Team" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-page items-center justify-between gap-6 px-gutter">
        <Logo variant="lockup" size="sm" href="#top" />

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="group relative inline-flex rounded-md px-3 py-2 text-small text-fg-secondary transition-colors duration-(--duration-fast) ease-out hover:text-foreground"
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-accent-brand transition-transform duration-(--duration-base) ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
                  />
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Button asChild size="sm">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            View on GitHub
            <ArrowUpRight aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
      </div>
    </header>
  );
}
