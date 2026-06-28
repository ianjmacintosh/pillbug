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
- **Anti-patterns:** Purple gradients, 3-column icon grids, bubble-radius everything, gradient buttons, stock-photo hero sections.

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
- **Text / Contrast:** `oklch(0.22 0.04 60)` — Warm Dark. Never pure black; has a slight warm cast.
- **Muted text:** `oklch(0.5 0 0)`
- **Links:** `oklch(0.42 0.1 55)` — Olive-warm brown. Deliberate departure from healthcare-blue links; fits the gold palette. **Do not change to blue without explicit decision.**
- **Link hover:** `oklch(0.3 0.1 55)`
- **Error / Danger text:** `oklch(0.4 0.15 25)`
- **Danger button:** `oklch(0.55 0.22 25)` with white text
- **Surface tinted:** `oklch(0.97 0.04 95)` — gold-tinted off-white for cards/sections
- **Surface raised:** `oklch(1 0 0)` — pure white for elevated surfaces
- **Page background:** `oklch(0.98 0 0)`

### Semantic Token Map

```css
--color-action        → oklch(0.87 0.36 95)   /* buttons, interactive */
--color-action-hover  → oklch(0.82 0.34 95)
--color-action-text   → oklch(0.22 0.04 60)   /* text ON gold surfaces */
--color-brand-bg      → oklch(0.9 0.4 95)     /* header, brand panels */
--color-surface-tinted → oklch(0.97 0.04 95)
--color-surface-raised → oklch(1 0 0)
--color-contrast      → oklch(0.22 0.04 60)   /* headings */
--color-text-primary  → oklch(0.22 0.04 60)
--color-text-muted    → oklch(0.5 0 0)
--color-link          → oklch(0.42 0.1 55)
--color-link-hover    → oklch(0.3 0.1 55)
--color-error         → oklch(0.4 0.15 25)
--color-focus-ring    → oklch(0.87 0.36 95)   /* same as action */
```

- **Dark mode:** Not yet implemented. Strategy when added: raise dark surface lightness to ~0.14–0.18, reduce gold chroma ~15%, keep semantic token names identical.

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
- **Border radius scale:** `4px` (buttons, inputs), `8px` (cards), `12px` (panels), `9999px` (pills/badges)
- **App screens:** Single-column max-width constrained layout. Bottom navigation tabs.
- **Auth/marketing screens (Register, Login):** Editorial split — 45% brand story panel / 55% form panel on desktop; story above form on mobile (640px breakpoint). The register page is a sales page first.

## Motion

- **Approach:** Minimal-functional — only transitions that aid comprehension.
- **Duration:** micro (50–100ms), short (150–250ms). Nothing over 300ms in the app shell.
- **Easing:** `ease-out` for enter; `ease-in` for exit.
- **No decorative animation.** No scroll-driven effects, no entrance choreography.

## Icons

- **Strategy:** Inline SVGs — no icon library dependency. This keeps the bundle lean and gives full control over stroke weights.
- **Grid:** 24×24 viewBox
- **Style:** Stroke-based, `fill="none"`, `stroke="currentColor"`, `strokeWidth="2"`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `aria-hidden="true"`.
- **Do not introduce an icon library** without an explicit decision. The current set (Prescriptions, Fill Session, Settings, Add, Check, Delete, Sign out) covers all current use cases.

## Button Conventions

| Variant          | Background                        | Text                              | Use                                                         |
| ---------------- | --------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Primary          | `--color-action` (gold)           | `--color-action-text` (warm dark) | Default CTA on gold-background surfaces                     |
| Primary on white | `oklch(0.22 0.04 60)` (warm dark) | white                             | CTA on white/light form panels (Register, etc.)             |
| Secondary        | transparent                       | `--gray-30`                       | Secondary actions, Cancel                                   |
| Danger           | `oklch(0.55 0.22 25)`             | white                             | Destructive actions only                                    |
| Ghost            | transparent                       | `--color-link`                    | Low-emphasis inline actions                                 |
| Small (modifier) | —                                 | —                                 | Apply `.button-sm` for tighter padding (0.25rem × 0.625rem) |

## Decisions Log

| Date       | Decision                                     | Rationale                                                                                                                                                                                                            |
| ---------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-26 | Aesthetic direction: Warm Utilitarian        | Establishes product character — warm but not clinical, precise but not cold                                                                                                                                          |
| 2026-06-26 | OKLCH-native color system                    | More perceptually uniform than HSL; vibrant on wide-gamut displays; future-proof                                                                                                                                     |
| 2026-06-26 | Olive-brown links (`oklch(0.42 0.1 55)`)     | Fits the gold palette; deliberate departure from healthcare-blue                                                                                                                                                     |
| 2026-06-26 | Instrument Sans as the approved body/UI sans | Humanist warmth, solid weight; not art-deco thin like PJS; not ubiquitous like Inter                                                                                                                                 |
| 2026-06-27 | Coiny replaces Lora as the heading font      | A patient sick of the struggle deserves something that adds fun and play — life isn't supposed to be a slog. Lora was warm but literary; Coiny is playful without being childish. Single weight (400), display-only. |
| 2026-06-26 | Inline SVG icons (no library)                | Zero dependency cost; full stroke control; current icon set is small and stable                                                                                                                                      |
| 2026-06-26 | Editorial split layout for auth screens      | Register page is a sales page first; must convince before asking for email                                                                                                                                           |
