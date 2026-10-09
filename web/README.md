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

## Deployment (AWS-42)

Host: Vercel. Connect `prathamsnehi/cyberdefense-hack-26` with production branch `main`.

Production: [Albert AI](https://albert-ai-nine.vercel.app). Project: [Vercel dashboard](https://vercel.com/blackmask-exes-projects/albert-ai).

| Project setting | Value |
| --- | --- |
| Root Directory | `web` |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | `22.x` |

`vercel.json` lives inside `web/`, the Vercel project root. It records the build settings and enables Git deployments. The Root Directory and repository connection are project settings in Vercel. `package.json` pins Node 22; `.nvmrc` selects it locally. No environment variables or secrets are needed for the landing. Do not copy the server's environment into this project.

In Vercel Settings > Git, enable preview deployments and pull request comments. Every PR changing `web/` should get a Vercel bot comment with its preview URL. Verify by opening a PR that edits this README and following the bot's link. Merging into `main` should create the production deployment. Keep production deployment protection off so the submitted HTTPS URL is public.

References: [Vercel build settings](https://vercel.com/docs/builds/configure-a-build), [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Git configuration](https://vercel.com/docs/project-configuration/git-configuration).

## Smoke test (AWS-47)

Use Node 22 and build the site first:

```bash
cd web
nvm use
npm ci
npx playwright install chromium
npm run build
npm run lint
npm run test:smoke
```

Without `LANDING_URL`, Playwright starts a local Vite preview of `dist/`. To check a deployment, supply its actual HTTPS URL:

```bash
LANDING_URL=https://your-actual-deployment.vercel.app npm run test:smoke
```

The smoke suite checks HTTP 200, every section, console/runtime and asset errors, navigation anchors, demo tabs with clicks and arrow keys, GitHub links, horizontal overflow at desktop and 390px mobile widths, and reduced motion. Full-page desktop/mobile screenshots go into `test-results/`; an HTML report goes into `playwright-report/`. Both are ignored by Git. Run `npx playwright show-report` to inspect the report.

Before submission, also open the production URL on a real phone, add the verified URL to the repository's top-level README and the submission form, and confirm the form lists it before 4:30 PM PT on October 9, 2026. Browser emulation does not replace that real-device check.

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
