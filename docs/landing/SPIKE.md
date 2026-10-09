# SPIKE: Albert AI Landing Page

| Field | Value |
| --- | --- |
| Event | Cyberdefense Hackathon #SFTechWeek by tokens&, AWS Builder Loft SF |
| Date | Oct 9 2026 |
| Deadline | Today, 4:00 PM PT |
| Repo | https://github.com/prathamsnehi/cyberdefense-hack-26 |
| Scope | `web/` only |
| Status | Decided |

## 1. Goal

Ship a single-page, static marketing site for Albert AI. In under a minute, it should explain:

1. **The threat.** One malicious email can take control of an AI agent that has access to email, code and money.
2. **The loop.** PREVENT > DETECT > PROVE > LEARN > WATCH, with the sponsor tool behind each step.
3. **The demo.** An invoice assistant that is attacked and then fixed.
4. **The positioning.** Existing tools attack, scan, or monitor separately. Albert AI closes the loop.

The page must look like the deck: near-black, condensed white display type, a single orange-red accent and thin rule bars.

## 2. Constraints

| Constraint | Detail |
| --- | --- |
| Time | Hard stop at 4:00 PM PT today. Anything not merged by then is cut. |
| Deploy | Static build on Vercel. Root directory is `web/`, framework preset is Vite, output is `dist/`. No server runtime. |
| Repo isolation | Do not touch `server/`, `guild-agents/`, `clickhouse/` or any other workstream folder. No root config changes. |
| Brand | Background `#0b0b0b`, accent `#FF4F1F`, Oswald for display, Inter for body. Small letter-spaced "ALBERT AI" eyebrow, slide-number labels ("01") and thin orange rules. |
| Language | English only. |
| Copy | Deck copy may be used verbatim. Only the demo metrics are allowed (50 variants, 3 still work, 0 work, timestamps 0:00 / 0:40 / 1:40 / 2:20). No invented numbers. |
| Claims | No absolute claims that other tools cannot detect these flaws. Comparisons describe categories only ("attack, scan, or monitor separately"). |
| Naming | Always "Albert AI". No legacy or alternate product names. No references to vendors outside the stack named in the deck. |
| Punctuation | No em dashes (U+2014) anywhere, including code, comments, commit messages and this doc. |

## 3. Research Summary

### 3.1 Emil Kowalski (emilkowal.ski "Great animations", "7 practical animation tips", animations.dev, Sonner, Vaul)

- **Purpose first.** Animate only where motion explains something, such as the loop sequence or the attack flow. Do not animate everything.
- **Fast.** UI motion stays under 300ms. Scroll reveals stay at roughly 400 to 600ms at most.
- **Custom ease-out.** Use `cubic-bezier(0.23, 1, 0.32, 1)` instead of the default `ease`.
- **Cheap properties.** Animate `transform` and `opacity` only. Never animate layout properties.
- **Interruptible.** Hover, focus and active states use CSS transitions, not keyframes.
- **Press feedback.** Buttons get `:active { transform: scale(0.97) }`.
- **No scale from zero.** Entrances start at `scale(0.93)` or higher, combined with opacity.
- **Origin-aware.** Popovers and menus scale from their trigger, not from the center.
- **Soft crossfades.** Add a small `blur(2px)` to mask crossfade seams.
- **Reduced motion.** When `prefers-reduced-motion: reduce` is set, fall back to opacity-only changes or none.
- **Fresh eyes.** Review motion the next day, or after a break, at 1x speed.

### 3.2 Linear Marketing Craft

- Dark canvas with a tight typographic hierarchy: one dominant headline per section.
- Generous whitespace and a crisp, repeated section rhythm (eyebrow, number, headline, body, visual).
- 1px hairline borders at low alpha (white at 6 to 10 percent). Subtle grid lines and radial gradients, used sparingly.
- Product-truth visuals: diagrams that mirror the real flow (email to agent to payment tool), not stock art.
- Restrained motion that supports reading order.

### 3.3 shadcn/ui

- Components are copied into the repo, not installed as a dependency. We own the code and can restyle freely.
- Built on Radix primitives, so accessibility (focus, keyboard, ARIA) comes for free.
- Themed through CSS variables (`--background`, `--primary`, and so on), which map directly onto brand tokens.
- The "new-york" style is the tighter, smaller-radius variant and fits the deck aesthetic.

## 4. Decision Criteria

| # | Criterion | Weight | Notes |
| --- | --- | --- | --- |
| C1 | Time to first deploy | 5 | Same-day deadline dominates. |
| C2 | Static output on Vercel with zero config | 4 | No server, no edge functions. |
| C3 | Brand fidelity via tokens | 4 | One source of truth for color, type and spacing. |
| C4 | Accessibility baseline | 4 | WCAG AA, keyboard, reduced motion. |
| C5 | Motion quality and control | 3 | Sequenced loop diagram and interruptible states. |
| C6 | Bundle size and performance | 3 | One page, should feel instant. |
| C7 | Team familiarity | 3 | Three people, parallel work. |
| C8 | SEO and share metadata | 2 | Title, description and OG image only. One URL. |

## 5. Options Compared

### 5.1 Framework: Next.js App Router vs Vite + React

Scores run from 1 to 5. The weighted column is score multiplied by weight.

| Criterion (weight) | Next.js App Router | Weighted | Vite + React 19 | Weighted |
| --- | --- | --- | --- | --- |
| C1 Time to deploy (5) | 3: RSC and client boundaries, `"use client"` friction with motion | 15 | 5: SPA, instant dev server | 25 |
| C2 Static on Vercel (4) | 4: needs `output: "export"` and image config caveats | 16 | 5: `dist/` folder, preset detected | 20 |
| C3 Tokens (4) | 5 | 20 | 5 | 20 |
| C4 A11y (4) | 5 | 20 | 5 | 20 |
| C5 Motion (3) | 4: client boundary per animated component | 12 | 5 | 15 |
| C6 Perf (3) | 4: framework runtime overhead for one page | 12 | 5 | 15 |
| C7 Familiarity (3) | 4 | 12 | 4 | 12 |
| C8 SEO (2) | 5: prerendered HTML | 10 | 4: static meta in `index.html` is enough for one URL | 8 |
| **Total** |  | **117** |  | **135** |

**Verdict:** Vite. Next.js mainly wins on SEO, and one landing page does not need prerendered HTML. Its routing, server components and image pipeline would go unused and add risk under a deadline.

### 5.2 Motion: `motion` (formerly Framer Motion) vs CSS-only

| Aspect | `motion` | CSS-only |
| --- | --- | --- |
| Hover, active, focus states | Overkill | Best fit: interruptible transitions |
| Scroll reveals | `whileInView` with `once: true`, easy | Needs IntersectionObserver glue code |
| Sequenced loop diagram (5 steps, staggered) | `staggerChildren` and variants, declarative | Manual `animation-delay` per item, brittle |
| Reduced motion | `useReducedMotion()` hook plus `MotionConfig reducedMotion="user"` | `@media (prefers-reduced-motion)` |
| Bundle | Roughly 5 kB with `LazyMotion` + `domAnimation` + `m` | 0 kB |
| Risk | Overuse | Time cost on sequencing |

**Verdict:** Use both, each where it fits.

- **CSS** handles all interaction states: buttons, links, cards, the `:active` scale and focus rings.
- **`motion`** is limited to:
  1. section entrance reveals (opacity plus 8 to 12px translateY);
  2. the PREVENT > LEARN > WATCH loop stagger;
  3. the threat flow line (email > agent > payments);
  4. the demo timeline progress.
- Load `motion` through `LazyMotion` and `m` components to keep the bundle small. Gate every animation behind `useReducedMotion`.

## 6. Decision

| Layer | Choice |
| --- | --- |
| Build | Vite, React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite`, design tokens in `@theme` in `src/styles/globals.css` |
| Components | shadcn/ui, style `new-york`, CSS variables mapped to brand tokens, base color neutral |
| Motion | `motion` with `LazyMotion`, `m`, `MotionConfig reducedMotion="user"` and `useReducedMotion` |
| Fonts | `@fontsource/oswald` (500, 600, 700) and `@fontsource/inter` (400, 500, 600), self-hosted, `font-display: swap` |
| Icons | `lucide-react`, imported per icon |
| Lint | ESLint (typescript-eslint, react-hooks, jsx-a11y) and Prettier |
| Deploy | Vercel, root directory `web/`, build `npm run build`, output `dist/` |

### 6.1 Token Map

Brand tokens are the only place hex values appear. Components use semantic utilities only (`bg-background`, `text-primary`, `border-border`).

| Brand token | Value | shadcn var | Use |
| --- | --- | --- | --- |
| `--color-ink` | `#0b0b0b` | `--background` | Page background |
| `--color-ink-raised` | `#141414` | `--card`, `--popover` | Surfaces |
| `--color-paper` | `#ffffff` | `--foreground` | Headings, body |
| `--color-paper-muted` | `#a1a1a1` | `--muted-foreground` | Secondary text (about 7.6:1 on ink) |
| `--color-accent` | `#FF4F1F` | `--primary`, `--ring` | Rules, numbers, CTAs |
| `--color-on-accent` | `#0b0b0b` | `--primary-foreground` | Text on accent |
| `--color-hairline` | `rgb(255 255 255 / 0.08)` | `--border`, `--input` | 1px borders |
| `--font-display` | Oswald | n/a | `h1` to `h3`, numbers, eyebrow |
| `--font-sans` | Inter | n/a | Body, UI |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | n/a | All transitions |
| `--duration-ui` | `180ms` | n/a | Hover, press |
| `--duration-reveal` | `500ms` | n/a | Section entrance |

### 6.2 Contrast Notes

Ratios are computed against `#0b0b0b`.

| Pair | Ratio | Ruling |
| --- | --- | --- |
| White text | about 19.7:1 | Passes |
| Accent `#FF4F1F` as text | about 6.0:1 | Passes AA for normal text |
| White on accent | about 3.3:1 | Fails AA for normal text |
| `#0b0b0b` on accent | about 6.0:1 | Passes |

Rules that follow from these ratios:

- Primary buttons use dark text on the accent.
- White on accent is allowed only for large display type (24px+, or 18.66px+ bold).

### 6.3 Page Structure

| # | Section | Content |
| --- | --- | --- |
| 1 | Nav | Wordmark, section anchors, GitHub link |
| 2 | Hero | Eyebrow "ALBERT AI". H1 from the deck hero line. Loop chips PREVENT > DETECT > PROVE > LEARN > WATCH. Line: "Every successful attack makes the next build safer." |
| 3 | Threat | Flow: Inbound email > AI agent > Payments tool. Pull quote: "Prompt injection: the attacker writes the instructions, the agent pays." Flaw kinds 01 to 03. |
| 4 | Loop | Steps 01 to 05, each with tool attribution: Senso, Semgrep, OpenAI + AkashML, Semgrep, ClickHouse. Guild is noted in PROVE and WATCH. |
| 5 | Demo | Invoice assistant timeline: 0:00, 0:40, 1:40, 2:20, using only the deck numbers |
| 6 | Positioning | Comparison table: Attack tools, Scan tools, Monitor tools vs Albert AI across the 5 steps, plus "attack results feed rules and brief" |
| 7 | Team | Luigi Canoro, Pratham Snehi, Leandro (@leandrodenos) |
| 8 | Footer | Hackathon credit, GitHub link |

## 7. PR Plan

### PR1: `feat/web-design-system` (base: `main`)

Scope:

- Scaffold `web/` with Vite, React 19, TypeScript, Tailwind v4 and the `@/` path alias.
- Add `globals.css` with `@theme` tokens and shadcn variable mapping.
- Add `components.json` (new-york).
- Install fonts and set up the `LazyMotion` / `MotionConfig` provider.
- Add primitives: `Button`, `Badge`, `Card`, `Separator`, plus brand pieces `Eyebrow`, `SlideNumber`, `RuleBar`, `Section` and `Reveal` (reduced-motion aware).
- Add ESLint and Prettier configs, `vercel.json` (if needed), and `index.html` meta and OG tags.

Done when:

- A token preview page renders.
- `npm run build` and `npm run lint` pass.
- The Vercel preview is live.

### PR2: `feat/web-sections` (stacked on PR1, base: `feat/web-design-system`)

Scope:

- All sections in 6.3 composed from PR1 primitives.
- Threat flow and loop animations.
- Demo timeline and comparison table.
- Responsive pass, a11y pass and copy audit.

Merge order: PR1 into `main`, retarget PR2 to `main`, then merge PR2.

Cut line if time runs short, in this order:

1. Drop the demo timeline animation (keep it static).
2. Drop the threat flow line animation.
3. Simplify the comparison table to a list.

## 8. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| shadcn CLI expects specific Tailwind v4 or alias setup | Configure the alias in both `tsconfig` and `vite.config.ts` before running `shadcn init`. Copy components manually if the CLI fails. |
| Vercel picks up the monorepo root | Set the project root directory to `web/` explicitly. |
| Accidental edits outside `web/` | PR diff check: `git diff --stat main -- . ':!web' ':!docs/landing'` must be empty. |
| Motion overuse | Cap at the four motion uses in 5.2. Review in the PR. |
| Copy drift | Run the grep audit in section 9 before merge. |

## 9. Acceptance Criteria

### Build and Quality

- [ ] `npm ci && npm run build` passes in `web/` with zero TypeScript errors.
- [ ] `npm run lint` passes with zero errors and no disabled a11y rules.
- [ ] Vercel production deploy serves the static `dist/` with no runtime errors in the console.

### Design System

- [ ] Tokens-only styling. No raw hex, rgb or arbitrary color values in components. Hex appears only in `globals.css`.
- [ ] The only accent is `#FF4F1F`. Display type is Oswald, body is Inter, both self-hosted (no Google Fonts requests).
- [ ] Hairline borders are 1px at low alpha. Section rhythm follows: eyebrow, slide number, headline, body.

### Accessibility

- [ ] WCAG AA contrast on all text, following the 6.2 ratios and rules.
- [ ] Single `h1` and an ordered heading hierarchy. Landmarks present: `header`, `main`, `nav`, `footer`.
- [ ] Every interactive element is keyboard reachable, with a visible focus ring (`--ring`).
- [ ] Icons are `aria-hidden` or labeled. Diagrams have text equivalents.

### Motion

- [ ] With `prefers-reduced-motion: reduce`, there is no translate, scale or blur. Opacity changes or none only.
- [ ] Only `transform` and `opacity` are animated. UI transitions are 300ms or less with the custom ease-out.
- [ ] Buttons use `:active` scale 0.97. No entrance starts below scale 0.93.

### Responsive

- [ ] No horizontal scroll and no clipped text at 360, 390, 768, 1024, 1280 and 1440px widths.
- [ ] The comparison table stays readable at 360px (stacked or scrollable with a visible affordance).

### Lighthouse Basics (mobile)

- [ ] Performance 90 or higher, Accessibility 95 or higher, Best Practices 95 or higher, SEO 90 or higher.
- [ ] `<title>`, meta description, OG title, description and image, favicon and `lang="en"` are set.
- [ ] Fonts are preloaded for the hero weights. No layout shift from font swap (CLS under 0.1).

### Copy Rules

- [ ] English only.
- [ ] Zero em dashes: `grep -rn $'\u2014' web/ docs/landing/` returns nothing.
- [ ] The product is always "Albert AI", and the grep check for legacy names returns nothing.
- [ ] No absolute claims about what other tools cannot detect.
- [ ] No metrics beyond the demo: 50 variants, 3 still work, 0 work, and the timestamps 0:00 / 0:40 / 1:40 / 2:20.
- [ ] No vendors named beyond Senso, Semgrep, OpenAI, AkashML, Guild and ClickHouse.
- [ ] The GitHub link points to https://github.com/prathamsnehi/cyberdefense-hack-26.
- [ ] The team is listed exactly as: Luigi Canoro, Pratham Snehi, Leandro (@leandrodenos).

### Repo Hygiene

- [ ] The diff touches only `web/` and `docs/landing/`.

## Second opinion (grok-4-6 via Neon AI Gateway)

Ship it, with cuts. Vite + React + TS + Tailwind is the right speed for a static Vercel page in `web/`. shadcn and motion are the tax. This landing is type, a loop strip, a 3-node threat chain, five steps, a 4-beat demo, a comparison grid, team. You do not need Radix primitives or a JS motion runtime to get Linear craft in 150 minutes. Tailwind v4 CSS-first config plus shadcn tokens plus Oswald/Inter plus `#FF4F1F` is real setup time. If `web/` is not already wired, stop adding libraries until hero, loop, and threat render.

Top 3 risks:
1. Toolchain. Tailwind v4 + shadcn + font faces inside a monorepo `web/` folder. Easy to burn 45 minutes on `@theme`, CSS variables, and aliases.
2. Scope. Eight deck sections. Polish all and none ship. Cut the comparison or team to one tight strip if the clock hits 90 minutes with no demo block.
3. Motion vs Emil. JS springs fight interruptible CSS. You will over-animate and skip `prefers-reduced-motion`.

Animation ideas (Emil, purposeful, transform/opacity only):
- Hero load: eyebrow, heading, orange rule, body. Stagger 40ms. opacity + `translateY(8px)`, 220ms, `cubic-bezier(0.23,1,0.32,1)`. Never `scale(0)`.
- Loop chips (PREVENT > DETECT > PROVE > LEARN > WATCH): CSS hover, 160ms. Active = 1px `#FF4F1F` bar.
- Demo beats (0:00 / 0:40 / 1:40 / 2:20): button swap, 2px blur crossfade, 200ms. Buttons `:active { scale: 0.97 }`.
- Steps 01-05: one-shot intersection fade. Reduced motion = opacity only.
- Comparison and team: still. Hairlines, grid, whitespace do the work.

**Resolution:** adopted. Motion is CSS-only (no JS motion runtime); shadcn limited to Button, Badge, Card, Separator.
