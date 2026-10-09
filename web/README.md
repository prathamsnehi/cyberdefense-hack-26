# Albert AI landing page

Landing page for Albert AI, built for the Cyberdefense Hackathon #SFTechWeek (tokens&, AWS Builder Loft SF).

This workspace lives only in `web/`. Do not touch the other folders in the monorepo (`server/`, `guild-agents/`, `clickhouse/`, etc.); they belong to other workstreams.

Repo: https://github.com/prathamsnehi/cyberdefense-hack-26

## Stack

- Vite + React 19 + TypeScript (strict, `verbatimModuleSyntax`, `noUnusedLocals`)
- Tailwind CSS v4 via `@tailwindcss/vite` (CSS-first, no `tailwind.config`)
- shadcn/ui components (new-york style), copied into `src/components/ui`
- CSS-only motion (no animation library)
- Fonts: `@fontsource-variable/oswald` (display), `@fontsource-variable/inter` (body)
- Icons: `lucide-react`
- Lint: oxlint

## Run

```bash
cd web
npm install
npm run dev       # local dev server
npm run build     # type check + production build to dist/
npm run preview   # serve the production build
npm run lint      # oxlint
```

## Token rule

UI consumes tokens only.

- All colors, type sizes, radii, durations and easings are defined once in `src/index.css` (`:root` primitives, semantic shadcn variables, `@theme inline` mapping).
- Components use the generated utilities: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `bg-primary`, `text-accent-brand`, `font-display`, `text-display-lg`, `tracking-eyebrow`, `duration-base`, `ease-out-expo`, and so on.
- No raw hex values and no arbitrary color values (`bg-[#...]`) in components. If a value is missing, add a token first.
- Accent text (`text-accent-brand`) is for large text only (headings, indexes). Body copy stays `text-foreground` or `text-muted-foreground`.

## Motion

- Fast and purposeful: UI transitions stay under 300ms, reveals use `--duration-reveal`.
- Animate only `transform` and `opacity`.
- Use `.reveal` with the `useReveal` hook for scroll reveals; it adds `.is-visible` once.
- `prefers-reduced-motion: reduce` falls back to opacity only, and `useReveal` shows content immediately.
- Buttons scale to 0.97 on press.

See `docs/landing/BRAND.md` for the full brand kit.

## Structure

```
web/
  index.html                 meta, title, og tags, favicon
  public/
    favicon.svg
  src/
    main.tsx                 entry, imports index.css
    App.tsx                  temporary design system preview
    index.css                tokens, theme mapping, base layer, utilities
    lib/
      utils.ts               cn()
    hooks/
      use-reveal.ts          IntersectionObserver reveal hook
    components/
      ui/                    shadcn primitives: button, badge, card, separator
      brand/                 eyebrow, rule, section-header
```

## Copy rules

- The product name is Albert AI.
- English only.
- No em dashes anywhere, including code comments. Use colons, commas or periods.
- Only use the demo numbers from the deck. Do not invent metrics.
