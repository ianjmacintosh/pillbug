# Design System — Pillbug

## Product Context

- **What this is:** A personal prescription reminder app for patients who want medication adherence without managing phone alarm clutter. Set it once, trust it daily.
- **Who it's for:** Patients managing ongoing prescriptions — people who take the same medications daily and want a lightweight, trustworthy habit, not a gamified tracker.
- **Space/industry:** Personal health / medication adherence. Anti-references: clinical hospital portals, wellness/spa apps, gamified health apps.
- **Project type:** Mobile-first web app (PWA-targeted).

## Memorable Thing

> "Professional and real, even with a more playful/casual color scheme and font selection."

The design paradox to resolve: serious function (medication compliance matters), warm form (a caring pharmacist friend, not a portal). Every choice should serve this.

## Aesthetic Direction

- **Direction:** Warm Utilitarian
- **Decoration level:** Intentional — color does the decorative work; no patterns, gradients, or decorative blobs
- **Mood:** Precise layout, expressive Companion Gold, no chrome that doesn't earn its place. Like a well-designed notebook: serious without being clinical.
- **Anti-patterns:** Purple gradients, 3-column icon grids, bubble-radius everything, stock-photo hero sections. Note: "gradient buttons" in this context means generic decorative gradient fills (blue-to-purple CTAs, etc.). The button face uses a deliberate concave radial gradient as a tactile skeuomorphic detail — this is intentional and not the anti-pattern.

## Typography

- **Headings (h1, h2):** Coiny — rounded display, single weight (400), playful and warm without being childish. Self-hosted (`/fonts/coiny-latin.woff2`). Token: `--font-display`. Used for h1/h2 only; do not use at body sizes.
- **Body / UI / Labels:** Instrument Sans — humanist warmth, solid weight, designed to pair alongside display text. More grounded than Inter; not art-deco thin. Load from Google Fonts CDN or self-host.
- **Current implementation:** `--font-sans` is set to `"Inter"` in `tokens.css`. Migration to Instrument Sans is the approved next step — swap the font-face declaration and `--font-sans` value.
- **Data/Tables:** Instrument Sans with `font-variant-numeric: tabular-nums`
- **Code:** Not applicable.
- **Rejected heading fonts:** Lora (too literary/clinical for the playful brief), Plus Jakarta Sans (too rounded and thin — "1920s art deco"), Chango (retro feel liked but weight too heavy).

### Type Scale

| Role            | Family          | Size     | Weight | Line-height              |
| --------------- | --------------- | -------- | ------ | ------------------------ |
| Display/Hero    | Coiny           | 3rem     | 400    | 1.1                      |
| H1              | Coiny           | 2.25rem  | 400    | 1.15                     |
| H2              | Coiny           | 1.75rem  | 400    | 1.2                      |
| H3              | Instrument Sans | 1.25rem  | 700    | 1.25                     |
| Body            | Instrument Sans | 1rem     | 400    | 1.6                      |
| Small / Caption | Instrument Sans | 0.875rem | 400    | 1.5                      |
| UI Label        | Instrument Sans | 0.75rem  | 700    | — (uppercase + tracking) |

## Color

- **Approach:** Balanced, OKLCH-native throughout. OKLCH produces more perceptually uniform, vibrant results than hex or HSL — this is a deliberate technical and aesthetic choice.
- **Primary surface:** `oklch(0.9 0.4 95)` — Companion Gold. Header backgrounds, brand surfaces, tinted backgrounds.
- **Primary action:** `oklch(0.87 0.36 95)` — Gold Action. Buttons, focus rings.
- **Action hover:** `oklch(0.82 0.34 95)`
- **Accent / Wells:** `oklch(0.50 0.22 249)` — Sky Blue. High-emphasis callout wells, secondary button borders/text. White text on this background. Gold + sky blue is the brand's dual-tone — warm brand energy (gold) + informational excitement (blue).
- **Accent tint:** `oklch(0.94 0.06 249)` — Sky Tint. Light-emphasis info backgrounds.
- **Text / Contrast:** `oklch(0.22 0.04 60)` — Warm Dark. Never pure black; has a slight warm cast.
- **Muted text:** `oklch(0.5 0 0)`
- **Links:** `oklch(0.42 0.1 55)` — Olive-warm brown. Deliberate departure from healthcare-blue links; fits the gold palette. **Do not change to blue without explicit decision.**
- **Link hover:** `oklch(0.3 0.1 55)`
- **Error / Danger text:** `oklch(0.4 0.15 25)`
- **Danger button:** `oklch(0.55 0.22 25)` with white text
- **Surface tinted:** `oklch(0.97 0.04 95)` — gold-tinted off-white for micro-UI (nav pills, hover states)
- **Surface raised:** `oklch(1 0 0)` — pure white for elevated surfaces
- **Page background:** `oklch(0.98 0 0)`

### Semantic Token Map

```css
--color-action        → oklch(0.87 0.36 95)   /* buttons, interactive */
--color-action-hover  → oklch(0.82 0.34 95)
--color-action-text   → oklch(0.22 0.04 60)   /* text ON gold surfaces */
--color-brand-bg      → oklch(0.9 0.4 95)     /* header, brand panels */
--color-surface-tinted → oklch(0.97 0.04 95)  /* micro-UI, nav pills */
--color-surface-raised → oklch(1 0 0)
--color-contrast      → oklch(0.22 0.04 60)   /* headings */
--color-text-primary  → oklch(0.22 0.04 60)
--color-text-muted    → oklch(0.5 0 0)
--color-link          → oklch(0.42 0.1 55)
--color-link-hover    → oklch(0.3 0.1 55)
--color-error         → oklch(0.4 0.15 25)
--color-focus-ring    → oklch(0.87 0.36 95)   /* same as action */
--color-well-bg       → oklch(0.50 0.22 249)  /* callout wells, deep sky */
--color-well-text     → oklch(1 0 0)           /* white on blue wells */
--color-well-bg-light → oklch(0.94 0.06 249)  /* low-emphasis info bg */
```

- **Dark mode:** Not yet implemented. Strategy when added: raise dark surface lightness to ~0.14–0.18, reduce gold chroma ~15%, reduce blue chroma ~20%, keep semantic token names identical.

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable (not compact, not spacious)
- **Scale:** `--space-1` (4px) through `--space-10` (48px / 3rem)

| Token      | Value          |
| ---------- | -------------- |
| --space-1  | 4px (0.25rem)  |
| --space-2  | 8px (0.5rem)   |
| --space-3  | 12px (0.75rem) |
| --space-4  | 16px (1rem)    |
| --space-5  | 20px (1.25rem) |
| --space-6  | 24px (1.5rem)  |
| --space-7  | 28px (1.75rem) |
| --space-8  | 32px (2rem)    |
| --space-9  | 40px (2.5rem)  |
| --space-10 | 48px (3rem)    |

## Layout

- **Approach:** Hybrid — grid-disciplined for app screens (predictable, data-first); editorial break on auth/marketing screens.
- **Max content width:** `min(92vw, 80rem)` via `--page-width`
- **Border radius scale:** `6px` (buttons), `4px` (inputs, small buttons), `8px` (cards, wells), `12px` (panels), `9999px` (pills/badges)
- **App screens:** Single-column max-width constrained layout. Bottom navigation tabs.
- **Auth/marketing screens (Register, Login):** Editorial split — 45% brand story panel / 55% form panel on desktop; story above form on mobile (640px breakpoint). The register page is a sales page first.

## Motion

- **Approach:** Minimal-functional — only transitions that aid comprehension.
- **Duration:** micro (50–100ms), short (150–250ms). Nothing over 300ms in the app shell.
- **Easing:** `ease-out` for enter; `ease-in` for exit.
- **No decorative animation.** No scroll-driven effects, no entrance choreography.

## Icons

- **Library:** Lucide React (`lucide-react`). Install: `npm install lucide-react`. Import named icons: `import { Pill, Calendar, Settings } from 'lucide-react'`.
- **Style:** Stroke-based, 24px default size (`size={24}`), `strokeWidth=2`, `strokeLinecap="round"`, `strokeLinejoin="round"`. Matches the hand-drawn aesthetic of Coiny.
- **Accessibility:** Pass `aria-hidden="true"` on decorative icons. Use `aria-label` when the icon is the only content of an interactive element (e.g. an icon-only button).
- **Tree-shakeable:** Only imported icons ship in the bundle — no concern about library size.
- **Do not revert to hand-rolled inline SVGs** for new icons. If Lucide doesn't have a matching icon, extend the import — it has 1,000+.

## Button Conventions

All buttons have `border-radius: 8px` and a **raised plastic feel**: a 6px dark bottom border + stacked drop shadow creates perceived depth. Hover depresses the button `translateY(+4px)` and collapses the bottom border to 2px, simulating a physical key press. Transitions: 80ms ease-out on background, transform, and box-shadow.

**Surface:** Primary, danger, and icon buttons use a **deep-dish radial gradient** — darker at center, lighter at the perimeter — with a bright 1px inset highlight at the top edge and a dark 1px inset shadow at the bottom edge. Together these create a concave bowl illusion (the "Arcade Punch" feel).

**Icon + text:** All button classes include `display: inline-flex; align-items: center; gap: 8px`. Any button can have an icon child — use Lucide React at `size={18}` for inline use (vs `size={24}` for standalone icon-only buttons). Icon goes left of label by default; trailing icon goes right.

| Variant          | Background                              | Text / Border                     | Use                                                                                        |
| ---------------- | --------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| Primary          | Gold deep-dish radial gradient          | `--color-action-text` (warm dark) | Default CTA on gold-background surfaces                                                    |
| Primary on white | `oklch(0.22 0.04 60)` (warm dark, flat) | white                             | CTA on white/light form panels (Register, etc.)                                            |
| Secondary        | transparent → sky tint on hover         | `--color-well-bg` (sky blue)      | Secondary actions, Cancel — blue border + text, no fill                                    |
| Danger           | Red deep-dish radial gradient           | white                             | Destructive actions only                                                                   |
| Ghost            | transparent                             | `--color-link`                    | Low-emphasis inline actions                                                                |
| Small (modifier) | —                                       | —                                 | Apply `.button-sm` for tighter padding (0.3125rem × 0.75rem)                               |
| Icon             | Gold deep-dish radial gradient, 48×48   | `--color-action-text`             | Icon-only button (`.button-icon`). Requires `aria-label`. Same raised + depress treatment. |

## Wells / Callouts

Use `.well` for high-emphasis callout blocks: confirmations, status messages, onboarding nudges. Sky blue background (`--color-well-bg`) with white text (`--color-well-text`). Border radius 8px.

For lower-emphasis informational blocks, use `--color-well-bg-light` (sky tint) with standard `--color-text-primary`.

Do not use `--color-surface-tinted` (gold tint) for callout wells — it is too subtle at 0.97 lightness and reads as near-white. Gold tint is reserved for micro-UI surfaces (nav pills, spacing indicators, subtle hover states).

## Decisions Log

| Date       | Decision                                                 | Rationale                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-26 | Aesthetic direction: Warm Utilitarian                    | Establishes product character — warm but not clinical, precise but not cold                                                                                                                                                                                                                                                                                                   |
| 2026-06-26 | OKLCH-native color system                                | More perceptually uniform than HSL; vibrant on wide-gamut displays; future-proof                                                                                                                                                                                                                                                                                              |
| 2026-06-26 | Olive-brown links (`oklch(0.42 0.1 55)`)                 | Fits the gold palette; deliberate departure from healthcare-blue                                                                                                                                                                                                                                                                                                              |
| 2026-06-26 | Instrument Sans as the approved body/UI sans             | Humanist warmth, solid weight; not art-deco thin like PJS; not ubiquitous like Inter                                                                                                                                                                                                                                                                                          |
| 2026-06-27 | Coiny replaces Lora as the heading font                  | A patient sick of the struggle deserves something that adds fun and play — life isn't supposed to be a slog. Lora was warm but literary; Coiny is playful without being childish. Single weight (400), display-only.                                                                                                                                                          |
| 2026-06-26 | Editorial split layout for auth screens                  | Register page is a sales page first; must convince before asking for email                                                                                                                                                                                                                                                                                                    |
| 2026-06-28 | Lucide React replaces inline SVGs                        | Style guide audit: inline SVGs are maintenance burden without quality benefit. Lucide is stroke-based, 24px grid, round caps — identical visual style, zero hand-rolled SVG maintenance. MIT, tree-shakeable.                                                                                                                                                                 |
| 2026-06-28 | Sky blue accent added (`oklch(0.50 0.22 249)`)           | Gold-only palette was too one-note to support Coiny's playfulness. Gold + sky blue = warm brand energy + informational excitement. Used in wells (`--color-well-bg`) and secondary buttons.                                                                                                                                                                                   |
| 2026-06-28 | Secondary button → sky blue border + text                | Generic gray secondary felt disconnected from the palette. Blue border + text ties secondary actions to the accent story. Sky tint fill on hover.                                                                                                                                                                                                                             |
| 2026-06-28 | Buttons: raised plastic feel (Arcade Punch direction)    | Replaced hover-lift with depress-on-press: 6px dark bottom border + shadow stacking creates perceived depth; translateY(+4px) + border collapse on hover simulates a physical key. More inviting and tactile than a flat lift. `.button-icon` (48×48) added with same treatment.                                                                                              |
| 2026-06-28 | Button face: deep-dish concave gradient                  | Radial gradient darker at center, lighter at edges (`ellipse 60% 50% at 50% 50%`) + bright top-edge inset highlight + dark bottom-edge inset shadow. Creates a concave bowl/dish illusion. This is a deliberate skeuomorphic tactile detail — distinct from the "gradient buttons" anti-pattern (which targets generic decorative gradients, not tactile surface treatments). |
| 2026-06-28 | Icon + text buttons: `inline-flex` on all button classes | All button classes now include `display: inline-flex; align-items: center; gap: 8px`. Any button works with or without an icon child. 18px Lucide icons for inline use, 24px for standalone icon-only.                                                                                                                                                                        |
