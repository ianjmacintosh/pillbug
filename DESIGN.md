---
name: Pillbug
description: Prescription schedule tracker — warm, personal, and reliable for daily patient use
colors:
  yellow-brand: "oklch(0.9 0.4 95)"
  yellow-border: "oklch(0.87 0.36 95)"
  yellow-surface: "oklch(0.95 0.06 95)"
  yellow-deep: "oklch(0.4 0.12 95)"
  sky-blue: "oklch(0.72 0.17 220)"
  sky-blue-interactive: "oklch(0.52 0.17 220)"
  sky-blue-hover: "oklch(0.42 0.17 220)"
  ink: "oklch(0.1 0 0)"
  text-secondary: "oklch(0.3 0 0)"
  text-muted: "oklch(0.5 0 0)"
  border: "oklch(0.7 0 0)"
  surface-raised: "oklch(0.9 0 0)"
  bg: "oklch(0.98 0 0)"
  danger: "oklch(0.55 0.22 25)"
  danger-hover: "oklch(0.45 0.22 25)"
typography:
  display:
    fontFamily: "'Sour Gummy', 'Sour Gummy Fallback', system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "3px"
  md: "4px"
  lg: "8px"
  xl: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 24px"
  button-primary-hover:
    backgroundColor: "{colors.border}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "10px 24px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "10px 24px"
  button-danger-hover:
    backgroundColor: "{colors.danger-hover}"
    textColor: "{colors.bg}"
---

# Design System: Pillbug

## 1. Overview

**Creative North Star: "The Trusted Companion"**

Pillbug is a personal tool built for the rhythms of real daily life — refilling the pill organizer on Sunday evening, checking off the 8am dose before leaving the house, looking up a prescription detail at the pharmacy. The interface is always there when you need it, never in the way when you don't. It earns trust not by announcing itself, but by being consistently reliable and warm.

The visual language is deliberately approachable. Georgia serif body text gives the app a human, slightly old-fashioned warmth — more like a trusted notebook than a clinical portal. Golden yellow grounds the identity without demanding attention; playful sky blue signals interaction and life. Together they say: this was made for a person, by someone who cares.

This system rejects three families of design by name. It is not a clinical/hospital UI — cold blue-and-white EHR forms have no place here. It is not a wellness/spa app — no soft gradients, no pastel greens, no mindfulness-app vibes. It is not a gamified health tracker — no streaks, no badges, no progress bars that trivialize medication adherence. Medication management is serious and personal; the interface meets that with warmth and clarity, not performance.

**Key Characteristics:**

- Warm, not clinical; personal, not institutional
- Typography carries personality (serif body reads as human and editorial)
- Golden yellow as brand anchor; sky blue as interactive counterpoint
- Expressive and rounded in components, never boxy or flat-corporate
- Privacy by default: minimal information on screen unless the patient actively chooses more
- WCAG AA floor, readability over elegance, designed for older users and all visual ranges

## 2. Colors: The Companion Palette

Two warm anchors (golden yellow + playful sky blue) grounded in an achromatic neutral scale. Neither shouting, neither hiding.

### Primary

- **Companion Gold** (`oklch(0.9 0.4 95)`): The brand anchor. Used as the header background, section accents, and primary surface color for brand-facing pages (Register, Login). Saturated and warm but never aggressive — a welcoming entrance, not a warning. Note: this value is near the P3 gamut edge; test on wide-gamut displays.
- **Deep Amber** (`oklch(0.4 0.12 95)`): The darkened yellow for on-colored-bg text and icon states. Used when yellow itself is the background and contrast is needed.
- **Border Gold** (`oklch(0.87 0.36 95)`): The header border and divider variant. One step darker than the brand surface; structural, not decorative.
- **Whisper Yellow** (`oklch(0.95 0.06 95)`): Tinted background for card headers inside yellow-adjacent surfaces (fill session cards). Low-chroma, keeps the warmth without overwhelming content.

### Secondary

- **Sky Blue** (`oklch(0.72 0.17 220)`): The interactive accent. Links, selected states, active chips, fill. Warm and clear — "playful" rather than corporate. Not the cool blue of an enterprise dashboard.
- **Sky Blue Interactive** (`oklch(0.52 0.17 220)`): Link text, interactive controls in their default state. Passes WCAG AA on white backgrounds (≥4.5:1).
- **Sky Blue Hover** (`oklch(0.42 0.17 220)`): Hover state for interactive blue elements.

_Note on reconciliation:_ existing code uses `oklch(0.45 0.15 250)` (hue 250, blue-violet) for link/interactive states. That hue should migrate toward 220 to align with the sky blue direction in future work.

### Neutral

- **Ink** (`oklch(0.1 0 0)`): Primary text. Near-black on the body background achieves ≥15:1 contrast.
- **Secondary Text** (`oklch(0.3 0 0)`): Supporting copy, labels, secondary information.
- **Muted Text** (`oklch(0.5 0 0)`): Placeholder text, inactive labels, supplementary metadata. Verify WCAG AA (≥4.5:1) on any non-white surface before using.
- **Border** (`oklch(0.7 0 0)`): Structural borders on inputs, cards, and dividers.
- **Surface Raised** (`oklch(0.9 0 0)`): Primary button background and mid-elevation surface tint.
- **Background** (`oklch(0.98 0 0)`): Page background. Near-white, achromatic. Contrast with Ink: ≥15:1.

### Danger

- **Alert Red** (`oklch(0.55 0.22 25)`): Destructive actions only. Delete button, hard-delete confirmation, error states.

**The One Red Rule.** Alert Red is reserved for destructive and irreversible actions. Error text uses it; success states, warnings, and neutral alerts do not. If you find yourself reaching for red to signal "important but not dangerous," find a yellow or blue instead.

**The No Pastel Rule.** Tinted neutrals are always achromatic (chroma 0) or very faintly hued (chroma ≤0.04). Never add warmth or coolness to neutral backgrounds by default — "warm neutral" is the AI-slop cliché this system explicitly rejects.

## 3. Typography

**Logotype Font:** Short Stack, weight 400 (Google Fonts; `.header-brand` only — the "Pillbug" brand name)
**Primary Font:** Prompt, weights 400 and 600 (Google Fonts; headings, body copy, labels, all UI text)
**UI fallback:** system-ui (only where Prompt is explicitly not wanted)

**Character:** Short Stack gives the brand name a casual, handwritten warmth without bleeding into the rest of the UI. Prompt carries everything else — friendly geometric personality, good at both display sizes (600 for page h1s) and body copy (400). Do not load additional weights of Short Stack; it only has 400 and faux-bold is not acceptable here.

### Hierarchy

- **Display** (weight 400, `clamp(1.75rem, 4vw, 3rem)`, line-height 1.1): Major page headings on brand-facing surfaces (Register, Login, landing). Aspirational: rounded display font.
- **Headline** (700, `1.25rem`, line-height 1.2): Section titles within the app, the branded app name in the header.
- **Title** (700, `1rem`, line-height 1.3): Component headers, sub-section labels, card titles.
- **Body** (400, `1rem`, line-height 1.6, Georgia serif): All paragraph copy, instructions, list items. Cap at 65ch for readability.
- **Label** (600, `0.875rem`, line-height 1.4, system-ui): Form labels, table headers, tag text. Not all-caps except in tightly constrained grid headers (fill session day/slot labels).

**The Serif Body Rule.** Georgia is not a legacy fallback — it is the deliberate voice of the app. Don't replace it with system-ui or Inter for body copy. The warmth it carries is the personality. Headlines and UI chrome stay in system-ui to contrast.

**The Logotype Rule.** Short Stack is the "Pillbug" brand mark only — the `.header-brand` element. Nowhere else. Page h1s, buttons, labels, and all other text use Prompt. Never synthesize a faux-bold of Short Stack; weight 400 is its only weight and the right one.

## 4. Elevation

Pillbug is essentially flat. Depth is expressed through background tint and border — not shadows — in the core app shell. The exception is the fill session card: a structural grid element that benefits from a subtle lift to read as a tangible object (the pill organizer itself).

The philosophy: surfaces are at rest by default. Interaction states (hover, focus) may introduce a shadow or shift, but the default page has no ambient glow, no layered glass, no stacked blur.

### Shadow Vocabulary

- **Card Lift** (`box-shadow: 0 2px 3px oklch(0 0 0 / 0.18), 0 1px 1px oklch(0 0 0 / 0.1)`): Used on fill session pill cells (`fill-session-card-cell`). Gives day-pills the physical quality of a button on an actual organizer. Nowhere else.

**The Flat-by-Default Rule.** Surfaces don't float unless they physically need to. Cards in the prescription list use border + tint, not shadow. If you're adding `box-shadow` to a new component, ask whether it's structurally necessary or just decorative. Usually it's decorative.

## 5. Components

### Buttons

Warm and expressive. Slightly rounded, substantial. Should feel satisfying to tap on mobile, clear to click on desktop.

- **Shape:** Gently rounded (4px radius — `{rounded.md}`)
- **Primary:** Light gray background (`oklch(0.9 0 0)`) with near-black text (`oklch(0.1 0 0)`). Padding: 10px vertical / 24px horizontal. Weight 600. The current primary button is intentionally understated — the yellow accent lives in the header, not the call-to-action. Review whether primary actions on brand-facing screens (Register/Login) should use the yellow brand color instead.
- **Hover:** Slightly darker surface (`oklch(0.7 0 0)`)
- **Disabled:** 60% opacity; `cursor: not-allowed`
- **Secondary:** Transparent background, `oklch(0.3 0 0)` text, 1px border in `oklch(0.7 0 0)`. Hover: gray-90 background fill.
- **Danger:** Alert Red background, white text. Destructive actions only. Hover: darker red.
- **Small modifier (`.button-sm`):** 4px / 10px padding, 12px font, 3px radius.
- **Focus:** `outline: 2px solid {colors.text-secondary}`, `outline-offset: 2px` for keyboard nav.

### Inputs / Fields

- **Style:** 42px height, 1px solid border (`oklch(0.7 0 0)`), 4px radius, 1rem font, full width.
- **Focus:** `outline: 2px solid oklch(0.3 0 0)`, `outline-offset: 2px`
- **Labels:** system-ui, 0.875rem, weight 600. Stacked above the field.
- **Error:** Red text below the field (`oklch(0.4 0.15 25)`), 0.875rem.
- **Field hints:** system-ui, 0.75rem, `oklch(0.3 0 0)` — note current value `var(--gray-30, #555)` passes contrast on white background.

### Cards / Containers

- **Prescription item selection:** `oklch(0.93 0.04 250)` background tint (a faint blue-tinted surface). Intentional — this should migrate toward `oklch(0.93 0.03 220)` to align with the sky blue secondary direction.
- **Fill Session Card:** 10px radius, 1px border (`oklch(0.9 0 0)`), white bg. Header section uses Whisper Yellow (`oklch(0.95 0.06 95)`) tint. Border-bottom separates header from grid when open.
- **Routine Block (prescription form):** 8px radius, 1px border (`#d0d5dd`), light gray background (`#f5f6f8`). Pending token alignment — values should migrate to the token system.
- **Internal grid:** Fill session uses a CSS grid with day/compartment axes; cell size is 2.5rem × 2.5rem with 6px radius and the Card Lift shadow.

### Navigation

- **Style:** Full-width header, golden yellow background (`oklch(0.9 0.4 95)`), 2px border-bottom in Border Gold.
- **Brand link:** system-ui, 1.25rem, weight 700. Near-black text on yellow — high contrast.
- **Nav links:** system-ui, 0.9rem, near-black. Right-aligned via `margin-left: auto`. Hover: underline.
- **Mobile:** No responsive collapse implemented yet. Nav links wrap in flex.

### Day Pills (prescription schedule)

A distinctive input pattern: 7 pill-shaped checkbox toggles representing days of the week, rendered in a grid. Unselected: light gray background, subtle box-shadow for a physical button feel. Selected: sky blue interactive fill, inset shadow, white checkmark. This component carries the warmth-and-expression direction most strongly of any interactive control in the app.

## 6. Do's and Don'ts

### Do:

- **Do** use Georgia serif for all body copy. It is the personality, not a legacy fallback.
- **Do** use OKLCH for all color definitions. The token system is OKLCH-only; hex values are for external tool compatibility only.
- **Do** respect `@media (prefers-reduced-motion: reduce)` on every animation. Patients may include older users; motion is never assumed.
- **Do** use sky blue (`oklch(0.52 0.17 220)`) for interactive text and link states — not the legacy `oklch(0.45 0.15 250)` blue-violet. Migrate existing instances toward hue 220.
- **Do** keep button labels as verb + object: "Save changes", "Delete prescription", "Add dose time". Not "OK", "Yes", or "Submit".
- **Do** verify ≥4.5:1 contrast for all body text, including muted text (`oklch(0.5 0 0)`) on any non-white surface before using it.
- **Do** design for privacy by default: sensitive information (prescription names, drug details) should be hidden by default when a shareable or over-the-shoulder context is possible.
- **Do** use the day-pill pattern (rounded checkbox toggles) when selecting days of the week — it carries the warm and expressive direction distinctively.

### Don't:

- **Don't** introduce a clinical or hospital UI aesthetic: cold blue-and-white, EHR-style dense form layouts, or anything that looks like a health system portal. That is the primary anti-reference.
- **Don't** use soft gradients, pastel greens, or mindfulness-app styling (flowing shapes, calming neutrals, spa color palettes). Pillbug is warm and friendly, not soft and therapeutic.
- **Don't** add game mechanics: streaks, badges, points, progress bars framed as achievement. Medication adherence is not a game; treating it as one is condescending and potentially dangerous.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent on cards or callouts. Full border, background tint, or leading icon instead.
- **Don't** use gradient text (`background-clip: text`). Single solid color only.
- **Don't** use the cream/sand/beige warm-neutral background (OKLCH L 0.84–0.97, chroma < 0.06, hue 40–100). The background is achromatic near-white. Warmth is carried by yellow and typography, not by a tinted canvas.
- **Don't** default to system-ui for all text. Georgia is the body font; the serif warmth is intentional and non-negotiable for paragraph copy.
- **Don't** put the same tiny all-caps tracked eyebrow above every section. One deliberate use per screen is a system; repeated use across every section is scaffolding.
