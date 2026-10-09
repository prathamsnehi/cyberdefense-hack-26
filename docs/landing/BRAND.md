# Albert AI Brand Kit

This is the source of truth for the Albert AI landing page (`web/`). It covers the name, voice, color, type, spacing, motion, and components. All values map to CSS custom properties in `web/src/index.css`. UI code consumes tokens only: no raw hex values and no arbitrary color values in components.

Context: built for the Cyberdefense Hackathon #SFTechWeek by tokens&, AWS Builder Loft SF, Oct 9 2026.

---

## 1. Name usage

- The product name is **Albert AI**. Write it as two words, capital A in both, with a space between.
- In eyebrows and small caps contexts, use the uppercase form: `ALBERT AI`.
- Never use: "Albert.ai", "AlbertAI", "Albert Ai", or any former working name such as "AgentGuard".
- "Albert" alone is fine in running copy after first mention (for example, "Albert flags the flaw").

## 2. Voice and copy rules

**Voice:** direct, technical, calm. Short declarative sentences. Show the mechanism, not adjectives.

**Core lines (verbatim from the deck):**
- Hero: "One malicious email can take control of an AI agent with access to email, code and money. Albert AI closes the loop."
- Loop: PREVENT > DETECT > PROVE > LEARN > WATCH.
- "Every successful attack makes the next build safer."
- Threat: "Prompt injection: the attacker writes the instructions, the agent pays."
- Positioning: "Existing tools attack, scan, or monitor separately. Albert AI closes the loop."

**Hard rules:**
1. English only.
2. No em dashes anywhere: copy, code, comments, alt text. Use colons, commas, or periods instead.
3. Never claim that "no tool detects this" or similar absolute claims about competitors.
4. Never invent metrics. The only numbers allowed are the demo numbers: 50 attack variants, 3 still work (rejected), 0 work (accepted), and the demo timestamps 0:00, 0:40, 1:40, 2:20.
5. Credit partner technologies accurately and only as described: Senso, Semgrep, OpenAI, AkashML, Guild, ClickHouse.
6. Do not mention third parties outside that list.
7. GitHub link: https://github.com/prathamsnehi/cyberdefense-hack-26
8. Team: Luigi Canoro, Pratham Snehi, Leandro (@leandrodenos).

**Style details:**
- Step labels are uppercase: PREVENT, DETECT, PROVE, LEARN, WATCH.
- Use slide-number style indices with a leading zero: 01, 02, 03.
- Sentence case for body copy and ledes. Display headings may be uppercase.

## 3. Logo and wordmark

- **Wordmark:** "ALBERT AI" set in Oswald Variable, bold, uppercase, tracking `0.2em` at eyebrow sizes and tracking `0.02em` at display sizes. Color: `--foreground`.
- **Mark (favicon):** near-black square (`#0b0b0b`) with an orange-red "A" or rule bar in `#FF4F1F`. File: `web/public/favicon.svg`.
- **Clear space:** at least the cap height of the wordmark on all sides.
- **Minimum size:** wordmark 12px cap height on screen, mark 16px.
- **Do not:** recolor the wordmark in accent, add gradients, outline, stretch, rotate, or place it on busy imagery.
- The orange rule bar may sit above or beside the wordmark as a brand accent. Never under the full width of body text.

## 4. Color

Background is near-black. A single orange-red accent carries emphasis. Everything else is grayscale.

### 4.1 Primitive tokens

| Role | Token | Value | Contrast on `#0b0b0b` | Notes |
| --- | --- | --- | --- | --- |
| Background | `--albert-black` | `#0b0b0b` | n/a | Page background |
| Surface 1 | `--albert-surface-1` | `#111111` | n/a | Raised sections |
| Surface 2 | `--albert-surface-2` | `#161616` | n/a | Cards, popovers |
| Surface 3 | `--albert-surface-3` | `#1c1c1c` | n/a | Hover on surfaces, inputs |
| Hairline | `--albert-hairline` | `rgb(255 255 255 / 0.08)` | decorative | 1px borders, grid lines |
| Hairline strong | `--albert-hairline-strong` | `rgb(255 255 255 / 0.14)` | decorative | Outline buttons, inputs, dividers that need presence |
| Text primary | `--albert-text-primary` | `#f5f5f5` | **18.05:1** | Headings and body. AAA |
| Text secondary | `--albert-text-secondary` | `#a3a3a3` | **7.80:1** | Ledes, descriptions. AAA |
| Text muted | `--albert-text-muted` | `#8a8a8a` | **5.70:1** | Captions, metadata. AA |
| Accent | `--albert-accent` | `#FF4F1F` | **5.99:1** | Rule bars, eyebrow index, primary button bg, key words |
| Accent hover | `--albert-accent-hover` | `#FF6A3D` | **6.92:1** | Hover state of accent surfaces |
| Accent subtle | `--albert-accent-subtle` | `rgb(255 79 31 / 0.12)` | non-text | Tinted backgrounds, badge fills |
| Destructive | `--albert-destructive` | `#ef4444` | **5.23:1** | Errors, "attack works" status |

### 4.2 Contrast on surfaces and pairings

| Pairing | Ratio | Result |
| --- | --- | --- |
| `#f5f5f5` on `#161616` (surface 2) | 16.6:1 | AAA |
| `#a3a3a3` on `#161616` | 7.17:1 | AAA |
| `#8a8a8a` on `#111111` (surface 1) | 5.47:1 | AA |
| `#8a8a8a` on `#161616` | 5.24:1 | AA |
| `#FF4F1F` on `#161616` | 5.51:1 | AA |
| `#0b0b0b` on `#FF4F1F` (primary button label) | 5.99:1 | AA |
| `#0b0b0b` on `#FF6A3D` (primary button hover) | 6.92:1 | AA |
| `#ffffff` on `#FF4F1F` | 3.29:1 | AA large only. Do not use for button labels |

Ratios use the WCAG 2.x relative luminance formula. `#0b0b0b` has luminance 0.00335, `#FF4F1F` has luminance 0.2695.

### 4.3 Accent usage

- Accent text on black passes AA for both normal (4.5:1) and large text (3:1). Even so, keep accent text to short emphasis: eyebrow indices, a single highlighted word, links on hover, step labels.
- Do not set paragraphs in accent.
- Labels on accent backgrounds are always near-black (`--primary-foreground`), never white.
- One accent moment per viewport is the target. The accent loses meaning if it is everywhere.

### 4.4 Semantic tokens (shadcn)

| Semantic token | Maps to |
| --- | --- |
| `--background` | `--albert-black` |
| `--foreground` | `--albert-text-primary` |
| `--card` / `--card-foreground` | `--albert-surface-2` / `--albert-text-primary` |
| `--popover` / `--popover-foreground` | `--albert-surface-2` / `--albert-text-primary` |
| `--primary` / `--primary-foreground` | `--albert-accent` / `--albert-black` |
| `--secondary` / `--secondary-foreground` | `--albert-surface-3` / `--albert-text-primary` |
| `--muted` / `--muted-foreground` | `--albert-surface-1` / `--albert-text-muted` |
| `--accent` / `--accent-foreground` | `--albert-surface-3` / `--albert-text-primary` (shadcn hover surface, not brand orange) |
| `--destructive` | `--albert-destructive` |
| `--border` | `--albert-hairline` |
| `--input` | `--albert-hairline-strong` |
| `--ring` | `--albert-accent` |

Note: in shadcn, `accent` means a neutral hover surface. Brand orange is exposed separately as `bg-accent-brand`, `text-accent-brand`, `bg-accent-brand-hover`, `bg-accent-brand-subtle`.

## 5. Typography

- **Display:** Oswald Variable (`font-display`). Condensed, bold (600 to 700), usually uppercase.
- **Body:** Inter Variable (`font-sans`). Regular 400, medium 500 for UI labels.
- **Mono (code, logs):** system mono stack (`font-mono`).

### 5.1 Scale

Fluid sizes use `clamp()` so headings scale between mobile and desktop without breakpoints.

| Utility | Size | Line height | Tracking | Use |
| --- | --- | --- | --- | --- |
| `text-display-xl` | `clamp(3rem, 2rem + 5vw, 6rem)` | 0.95 | -0.01em | Hero headline |
| `text-display-lg` | `clamp(2.5rem, 1.75rem + 3.5vw, 4.5rem)` | 1.0 | -0.01em | Section headings |
| `text-display-md` | `clamp(2rem, 1.5rem + 2vw, 3rem)` | 1.05 | 0 | Sub-section headings |
| `text-display-sm` | `clamp(1.5rem, 1.25rem + 1vw, 2rem)` | 1.1 | 0 | Card titles, step names |
| `text-lede` | `clamp(1.125rem, 1rem + 0.5vw, 1.375rem)` | 1.5 | 0 | Intro paragraphs |
| `text-body` | `1rem` | 1.6 | 0 | Default body |
| `text-small` | `0.875rem` | 1.5 | 0 | Secondary UI text |
| `text-eyebrow` | `0.75rem` | 1.2 | 0.2em | Uppercase eyebrows, "ALBERT AI" |
| `text-caption` | `0.75rem` | 1.4 | 0.01em | Captions, metadata |

### 5.2 Rules

- Headings: `font-display`, uppercase, `text-foreground`.
- Ledes: `text-lede text-text-secondary`, max width about 60ch.
- Body: max width about 68ch.
- Eyebrow: `text-eyebrow uppercase font-sans font-medium`, index number in accent (for example `02`), label in muted.
- Numerals in timelines and indices use `tabular-nums`.

## 6. Spacing and layout

| Token | Value | Use |
| --- | --- | --- |
| `--section-y` | `clamp(5rem, 3rem + 8vw, 10rem)` | Vertical padding between sections |
| `--section-gap` | `clamp(2.5rem, 2rem + 2vw, 4rem)` | Header to content gap inside a section |
| `--container-max` | `72rem` | Content max width |
| `--gutter` | `clamp(1.25rem, 1rem + 2vw, 2.5rem)` | Horizontal page padding |

- Use the Tailwind 4px spacing scale inside components.
- Sections follow one rhythm: eyebrow, rule, heading, lede, content. Keep it consistent.
- Generous whitespace beats more content. One idea per section.
- `.bg-grid` draws a hairline grid with `--albert-hairline`. Use behind the hero or the loop diagram only, never behind dense text.

## 7. Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius` | `0.375rem` | Base |
| `rounded-sm` | `calc(var(--radius) - 2px)` | Badges, small chips |
| `rounded-md` | `var(--radius)` | Buttons, inputs |
| `rounded-lg` | `calc(var(--radius) + 2px)` | Cards |
| `rounded-xl` | `calc(var(--radius) + 6px)` | Large panels, demo frame |

The deck is sharp and editorial. Keep radius small. Rule bars are square.

## 8. Motion

Principles follow Emil Kowalski ("Great animations", "7 practical animation tips", animations.dev):

1. **Purposeful, not everywhere.** Animate to explain a change in state or to guide attention. Static is a valid choice.
2. **Fast.** UI feedback under 300ms. Only scroll reveals run longer.
3. **Ease-out for entering.** Custom curves, never the default `ease`.
4. **Transform and opacity only.** No animating width, height, top, left, or box-shadow.
5. **Interruptible.** Prefer CSS transitions over keyframes for interactive state, so a reversed hover does not jump.
6. **Never from scale(0).** Start at 0.93 or higher together with opacity.
7. **Origin-aware.** Popovers and menus scale from their trigger side.
8. **Small blur on crossfades.** Up to 2px to hide mismatched frames.
9. **Press feedback.** Buttons scale to 0.97 on `:active`.
10. **Respect reduced motion.** Fall back to opacity only, short duration.
11. **Review with fresh eyes.** Re-check animations the next day and at slowed speed.

### 8.1 Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--duration-instant` | `0ms` | Reduced motion, immediate state |
| `--duration-fast` | `150ms` | Hover colors, button press |
| `--duration-base` | `220ms` | Popovers, tabs, small transitions |
| `--duration-slow` | `400ms` | Larger panels, drawers |
| `--duration-reveal` | `600ms` | Scroll reveals only |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Default for entering and hover |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Elements moving on screen |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Drawers and sheets (Vaul curve) |

Tailwind utilities: `ease-out`, `ease-in-out`, `ease-drawer`, and durations via `duration-(--duration-fast)` and similar.

### 8.2 Patterns

- **Scroll reveal:** `.reveal` starts at `opacity: 0; transform: translateY(12px)` and transitions to `.is-visible` using `--duration-reveal` and `--ease-out`. Applied once by `useReveal`. Stagger siblings by 60 to 80ms, max 4 items.
- **Reduced motion:** `.reveal` becomes opacity only with `--duration-fast`. Transforms and keyframes are disabled. `useReveal` marks elements visible immediately.
- **Buttons:** `transition` on transform and colors with `--duration-fast` and `--ease-out`, `active:scale-[0.97]`.
- **Loop diagram:** highlight one step at a time with color and opacity. Do not spin or bounce.

## 9. Components

All components live in `web/src/components/` and use token utilities only.

| Component | File | Notes |
| --- | --- | --- |
| Button | `ui/button.tsx` | Variants: `default` (accent bg, black label), `outline` (hairline border), `ghost`, `link`. Sizes: `sm`, `default`, `lg`, `icon`. `asChild` via Radix Slot. Press scale 0.97 |
| Badge | `ui/badge.tsx` | Small uppercase label. Variants for default, outline, accent subtle, destructive |
| Card | `ui/card.tsx` | Surface 2, hairline border, `rounded-lg`. Header, title, description, content, footer |
| Separator | `ui/separator.tsx` | Plain `div` with `role="separator"` (or `role="none"` when decorative), hairline color |
| Eyebrow | `brand/eyebrow.tsx` | Uppercase, `0.2em` tracking, optional index in accent (`02`) |
| Rule | `brand/rule.tsx` | Thin orange bar, horizontal, configurable width. Default 2px tall, 48px wide |
| SectionHeader | `brand/section-header.tsx` | Eyebrow, rule, display heading, optional lede |

Focus: all interactive elements show a 2px accent ring with a 2px offset on `:focus-visible`. Selection uses the accent.

## 10. Do and don't

**Do**
- Use near-black backgrounds with one accent moment per view.
- Use thin orange rules to mark the start of a section.
- Use slide-number indices (01 to 05) for the loop steps.
- Use product-truth visuals: real code, real rules, real log rows from the demo.
- Use 1px hairlines at low alpha for structure.
- Keep motion fast, eased out, and optional.
- Quote the demo numbers exactly: 50 variants, 3 still work, then 0 work.

**Don't**
- Use em dashes, anywhere.
- Invent metrics, customer logos, or testimonials.
- Claim that no other tool detects this.
- Write the name as anything other than Albert AI.
- Put white text on orange.
- Use raw hex or arbitrary color values in components.
- Add gradients to the wordmark or large glowing effects.
- Animate layout properties or start animations from scale(0).
- Use more than two typefaces.
