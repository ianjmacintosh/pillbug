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

All font sizes must use a `--text-*` token. No hard-coded `font-size` values are permitted anywhere in the codebase.

| Token            | Role                                    | Family          | Size                        | Weight  | Line-height              |
| ---------------- | --------------------------------------- | --------------- | --------------------------- | ------- | ------------------------ |
| `--text-hero`    | Register brand hero                     | Coiny           | `clamp(3rem, 12.5vw, 8rem)` | 400     | 1.1                      |
| `--text-display` | Display / style guide                   | Coiny           | 3rem                        | 400     | 1.1                      |
| `--text-h1`      | H1                                      | Coiny           | 2.25rem                     | 400     | 1.15                     |
| `--text-h2`      | H2                                      | Coiny           | 1.75rem                     | 400     | 1.2                      |
| `--text-xl`      | Large inputs / OTP display              | Instrument Sans | 1.5rem                      | 600     | —                        |
| `--text-h3`      | H3                                      | Instrument Sans | 1.25rem                     | 700     | 1.25                     |
| `--text-lg`      | Section subheadings / list titles       | Instrument Sans | 1.125rem                    | 700     | —                        |
| `--text-base`    | Body                                    | Instrument Sans | 1rem                        | 400     | 1.6                      |
| `--text-sm`      | Caption / secondary                     | Instrument Sans | 0.875rem                    | 400     | 1.5                      |
| `--text-xs`      | UI labels / pills                       | Instrument Sans | 0.75rem                     | 700     | — (uppercase + tracking) |
| `--text-2xs`     | Nav tab labels / footer micro           | Instrument Sans | 0.65rem                     | 500–700 | —                        |
| `--text-3xs`     | Organizer grid micro (FillSession only) | Instrument Sans | 0.5625rem                   | 400–700 | —                        |

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
--color-page-bg        → oklch(0.98 0 0)      /* page background (body) */
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

## Brand Motif

A motif is a visual idea that recurs in multiple formats and ties a design together — when used consistently it converts a collection of screens into a recognizable brand. See [Erik Kennedy's explanation](https://www.learnui.design/blog/spice-up-designs-create-cohesive-brand.html) for the full theory and examples.

Pillbug's motif is the **tilted gold pill**. The shape is native to the product name and the medication domain, making it doubly meaningful. Tilting it adds energy; the gold fill ties it directly to the brand's primary action color.

### Where it appears

- **Register page** — behind each feature icon at a unique per-item angle (−22°, +14°, −10°)
- Extend to: empty states, onboarding illustrations, loading indicators, marketing surfaces — any place that needs a visual anchor without adding new shapes

### How to use it

The `.icon-pill` utility class in `global.css` accepts a `--pill-angle` CSS custom property. The icon inside counter-rotates automatically so it stays upright:

```html
<span class="icon-pill" style="--pill-angle: -22deg">
  <Lock aria-hidden="true" />
</span>
```

Rules:

- Vary the angle per instance — no two adjacent pills should share the same angle
- Icon size should exceed the pill height (16px) so the pill reads as a band across the icon, not a container around it
- Use `--color-action` (gold) fill only; do not recolor the pill without a design decision

## Button Conventions

All buttons have `border-radius: 8px` and a **raised plastic feel**: a 6px dark bottom ledge + stacked drop shadow creates perceived depth. Hover depresses the button `translateY(+4px)` and collapses the ledge to 2px, simulating a physical key press. Transitions: 80ms ease-out on background-color, transform, and box-shadow.

**Surface:** Each variant has a darker `border` for the outer rim (separate from the ledge shadow), plus a bright 2px inset highlight at the top edge that creates a subtle concave lip.

**Icon + text:** Add `.button-leading-icon` alongside the variant class when a button has an icon child. It sets `gap: 10px` between icon and label. Use Lucide React at `size={18}` for inline use (vs `size={24}` for standalone icon-only buttons). Icon goes left of label by default; swap order for a trailing chevron.

| Variant          | Background                              | Text / Border                     | Use                                                                                        |
| ---------------- | --------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| Primary          | `--color-action` (gold, flat)           | `--color-action-text` (warm dark) | Default CTA on gold-background surfaces                                                    |
| Primary on white | `oklch(0.22 0.04 60)` (warm dark, flat) | white                             | CTA on white/light form panels (Register, etc.)                                            |
| Secondary        | transparent → sky tint on hover         | `--color-well-bg` (sky blue)      | Secondary actions, Cancel — blue border + text, no fill                                    |
| Danger           | `oklch(0.55 0.22 25)` (red, flat)       | white                             | Destructive actions only                                                                   |
| Ghost            | transparent                             | `--color-link`                    | Low-emphasis inline actions                                                                |
| Small (modifier) | —                                       | —                                 | Apply `.button-sm` for tighter padding (0.3125rem × 0.75rem)                               |
| Icon             | `--color-action` (gold, flat), 48×48    | `--color-action-text`             | Icon-only button (`.button-icon`). Requires `aria-label`. Same raised + depress treatment. |

### Soft-disabled buttons (blocked interaction)

When a button cannot proceed because required input is missing — but the reason is explainable — prefer **soft-disable** over the native `disabled` attribute.

**Why:** Native `disabled` removes the element from tab order and hides it from some screen readers. Soft-disabled buttons remain focusable and tabbable; clicking one registers the attempt and gives immediate, specific feedback.

**How:** Pass `onDisabledClick` to the `Button` component alongside `disabled={true}`. The component automatically:

- Renders with `aria-disabled="true"` instead of the native attribute
- Renders with diagonal stripes (warm-dark at 14% opacity) to signal the blocked state at rest
- Intercepts clicks: prevents form submission, triggers a spring-back animation (2px press → -2px overshoot → settle) with the ledge shadow tracking the downward movement
- Calls your callback so you can surface a hint (use the `form-missing-hint` class + `role="status"`)

**Form field highlighting:** When the blocked callback fires, set a `hasAttemptedSubmit` flag and pass the current `missingFields` set down to field components as `highlightedFields`. Fields apply `field--error` (error-red outline) which persists until the field is filled. The first missing field also receives a `scrollIntoView` call.

```tsx
<Button
  type="submit"
  disabled={form.submitting || form.missingFields.length > 0}
  onDisabledClick={
    form.missingFields.length > 0 && !form.submitting
      ? showBlockedHint
      : undefined
  }
  className="button-primary button-leading-icon button-full"
>
  Save prescription
</Button>
```

The hint message uses `t("prescriptionForm.stillNeeded", { fields })` (e.g. "Still needed: drug name, dosing days") and auto-dismisses after 4 seconds.

**When NOT to use:** Actions that are blocked by a system state the user can't affect right now (e.g., loading, permission denied, server error) — use native `disabled` for those. Soft-disable is only for "fill in X to continue."

## Wells / Callouts

Use `.well` for high-emphasis callout blocks: confirmations, status messages, onboarding nudges. Sky blue background (`--color-well-bg`) with white text (`--color-well-text`). Border radius 8px.

For lower-emphasis informational blocks, use `--color-well-bg-light` (sky tint) with standard `--color-text-primary`.

Do not use `--color-surface-tinted` (gold tint) for callout wells — it is too subtle at 0.97 lightness and reads as near-white. Gold tint is reserved for micro-UI surfaces (nav pills, spacing indicators, subtle hover states).

## Decisions Log

| Date       | Decision                                                 | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-26 | Aesthetic direction: Warm Utilitarian                    | Establishes product character — warm but not clinical, precise but not cold                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-06-26 | OKLCH-native color system                                | More perceptually uniform than HSL; vibrant on wide-gamut displays; future-proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-06-26 | Olive-brown links (`oklch(0.42 0.1 55)`)                 | Fits the gold palette; deliberate departure from healthcare-blue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-06-26 | Instrument Sans as the approved body/UI sans             | Humanist warmth, solid weight; not art-deco thin like PJS; not ubiquitous like Inter                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-06-27 | Coiny replaces Lora as the heading font                  | A patient sick of the struggle deserves something that adds fun and play — life isn't supposed to be a slog. Lora was warm but literary; Coiny is playful without being childish. Single weight (400), display-only.                                                                                                                                                                                                                                                                                                                                              |
| 2026-06-26 | Editorial split layout for auth screens                  | Register page is a sales page first; must convince before asking for email                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-06-28 | Lucide React replaces inline SVGs                        | Style guide audit: inline SVGs are maintenance burden without quality benefit. Lucide is stroke-based, 24px grid, round caps — identical visual style, zero hand-rolled SVG maintenance. MIT, tree-shakeable.                                                                                                                                                                                                                                                                                                                                                     |
| 2026-06-28 | Sky blue accent added (`oklch(0.50 0.22 249)`)           | Gold-only palette was too one-note to support Coiny's playfulness. Gold + sky blue = warm brand energy + informational excitement. Used in wells (`--color-well-bg`) and secondary buttons.                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-06-28 | Secondary button → sky blue border + text                | Generic gray secondary felt disconnected from the palette. Blue border + text ties secondary actions to the accent story. Sky tint fill on hover.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-06-28 | Buttons: raised plastic feel (Arcade Punch direction)    | Replaced hover-lift with depress-on-press: 6px dark bottom border + shadow stacking creates perceived depth; translateY(+4px) + border collapse on hover simulates a physical key. More inviting and tactile than a flat lift. `.button-icon` (48×48) added with same treatment.                                                                                                                                                                                                                                                                                  |
| 2026-06-28 | Button surface: darker border + top inset highlight      | Real `border` for the rim (one step darker than the face, above the ledge color). Bright 2px inset highlight at top creates a subtle lip/concave feel. Flat background — the highlight alone reads as surface depth without gradient noise. Chosen after a prototype-first exploration of gradient vs inset-shadow approaches; stacking multiple inset shadows produced muddy overlaps.                                                                                                                                                                           |
| 2026-06-28 | Icon + text buttons: `inline-flex` on all button classes | All button classes now include `display: inline-flex; align-items: center; gap: 8px`. Any button works with or without an icon child. 18px Lucide icons for inline use, 24px for standalone icon-only.                                                                                                                                                                                                                                                                                                                                                            |
| 2026-06-30 | `.button-leading-icon` modifier for icon + text buttons  | Explicit opt-in class (rather than `:has` selector magic) that sets `gap: 10px` for balanced icon/label spacing. Apply alongside the variant class whenever a button has a leading icon child.                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-06-30 | Tilted gold pill established as the brand motif          | The pill shape is native to the product name and medication domain. Tilting it adds energy; varying angle per instance keeps it feeling hand-placed. Implemented as `.icon-pill` + `--pill-angle` CSS custom property. Counter-rotation keeps the icon upright automatically.                                                                                                                                                                                                                                                                                     |
| 2026-07-02 | Soft-disabled buttons via `onDisabledClick` prop         | Native `disabled` removes buttons from tab order and hides intent from screen readers. When the blocking condition is user-fixable (missing required fields), prefer `aria-disabled="true"` + a blocked-click callback. Diagonal stripes signal blocked state at rest. Spring-back animation (partial press + overshoot) fits the skeuomorphic arcade button metaphor — a blocked button resists rather than rattles. Missing fields receive persistent error-red outlines; the first missing field scrolls into view. See "Soft-disabled buttons" section above. |
