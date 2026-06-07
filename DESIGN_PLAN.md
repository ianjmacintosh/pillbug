# Design Implementation Plan: Register Screen

## Summary

- **Scope:** Full page redesign
- **Target:** `src/components/Register/Register.tsx` + `src/components/Register/Register.css`
- **Winner:** Variant B — Editorial Split Layout
- **Key improvement:** Page is a sales page first, registration form second. The redesign makes that explicit with a dedicated brand story panel.
- **Design system note:** This redesign establishes visual patterns for the entire app.

## Design Decisions

### Layout

Two-column grid on desktop. Single column on mobile with **brand story above form** (sell first, then ask for email).

```
Mobile:           Desktop:
┌────────────┐    ┌──────────────┬───────────────┐
│ Brand story│    │ Brand story  │  Form         │
│ (yellow bg)│    │ (yellow-90)  │  (white)      │
├────────────┤    │  45%         │  55%          │
│ Form       │    └──────────────┴───────────────┘
│ (white bg) │
└────────────┘
```

### Column widths

- Left (story): `45%` — enough room for a headline + 3 features
- Right (form): `55%` — breathing room for form fields
- Breakpoint: `640px` (matches existing Register.css breakpoint)

### Visual tokens

| Element            | Token                                                                |
| ------------------ | -------------------------------------------------------------------- |
| Story panel bg     | `var(--yellow-90)`                                                   |
| Story panel border | `var(--yellow-87)` (right border on desktop)                         |
| Form panel bg      | `oklch(1 0 0)` (white)                                               |
| Story heading      | `var(--font-body)`, `--text-display`, weight 600                     |
| Feature label      | `var(--font-body)`, `--text-sm`, weight 600                          |
| Feature body       | `var(--font-body)`, `--text-sm`, `--gray-30`                         |
| Input border       | `oklch(0.85 0 0)` — neutral (not yellow, contrast with yellow panel) |
| Button bg          | `var(--gray-10)` — high contrast dark button on white form           |
| Button text        | `oklch(1 0 0)` — white                                               |
| Label text         | `var(--gray-10)`                                                     |

### Why gray-10 button (not yellow)?

The yellow-90 panel already dominates warmth. A yellow button on the white form side would fight with the panel. A near-black button on white is high-contrast and authoritative.

### Turnstile

Do not attempt to restyle the Cloudflare Turnstile widget. Verify in Cloudflare docs whether appearance options exist. For now: place it between the email field and the terms checkbox, same as current.

## Files to Change

- [ ] `src/components/Register/Register.tsx` — restructure JSX, split into story + form columns
- [ ] `src/components/Register/Register.css` — rewrite layout, story panel, form panel styles

## Implementation Steps

### Step 1: HTML structure

```tsx
<main className="register">
  {/* Left: brand story */}
  <div className="register-story">
    <p className="register-eyebrow">Pillbug</p>
    <h2 className="register-headline">{t("register.pitch.headline")}</h2>
    <ul className="register-features">
      <li>…</li>
    </ul>
    <p className="register-footer-copy">…</p>
  </div>

  {/* Right: form */}
  <div className="register-form-col">
    <div className="register-card">
      <h1>{t("register.heading")}</h1>
      <form>…</form>
    </div>
    <p className="rv1-login">…</p>
  </div>
</main>
```

Mobile CSS order: `.register-story { order: 0 }`, `.register-form-col { order: 1 }` inside a flex column.

### Step 2: CSS grid

```css
.register {
  display: grid;
  grid-template-columns: 45% 55%;
  min-height: calc(100vh - /* header + footer height */);
  align-items: stretch;
}

@media (max-width: 640px) {
  .register {
    grid-template-columns: 1fr;
  }
  .register-story {
    order: 0;
  }
  .register-form-col {
    order: 1;
  }
}
```

### Step 3: Story panel styles

```css
.register-story {
  background-color: var(--yellow-90);
  padding: var(--space-2xl) var(--space-xl);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-xl);
}

.register-eyebrow {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--yellow-40);
}

.register-headline {
  font-family: var(--font-body);
  font-size: var(--text-display);
  font-weight: var(--weight-semibold);
  color: var(--gray-10);
  line-height: 1.15;
  text-wrap: balance;
}
```

### Step 4: Feature list

Three feature items (already in i18n). Mark each with an icon (emoji or CSS shape — no new deps). Suggested approach: `::before` pseudo-element or inline emoji in the translation string.

```css
.register-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.register-feature {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
  font-size: var(--text-sm);
  color: var(--gray-30);
  line-height: 1.55;
}

.register-feature strong {
  color: var(--gray-10);
  font-weight: var(--weight-semibold);
}
```

### Step 5: Form column

```css
.register-form-col {
  background-color: oklch(1 0 0);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--space-2xl) var(--space-xl);
}

.register-card {
  /* Remove yellow background — card is now just a layout zone in white column */
  background: none;
  border: none;
  border-radius: 0;
  padding: 0;
  max-width: 400px;
}
```

### Step 6: Button

Change `.button-primary` use to a new scoped rule or update the global if gray-10/white is the right primary everywhere:

```css
.register .button-primary {
  background-color: var(--gray-10);
  color: oklch(1 0 0);
}

.register .button-primary:hover {
  background-color: var(--gray-30);
  color: oklch(1 0 0);
}
```

Consider whether this button style should graduate to a global `.button-primary` update — this is a design system decision for later.

### Step 7: Mobile story truncation (optional)

On mobile, the story panel could show a shorter version: just the headline and one feature, with "and more" implied. Decide during implementation.

## Required UI States

- **Loading (submit):** Button text changes to submitting string; button disabled
- **Error (API fail):** `role="alert"` paragraph with error copy — already implemented
- **Turnstile error:** Already handled; keep as-is
- **Turnstile loading:** The widget handles its own loading state; no changes needed
- **Terms unchecked:** Form validates on submit; show error inline

## Accessibility Checklist

- [ ] `<h1>` is the form heading, `<h2>` is the story headline (story panel renders second in DOM on desktop, first on mobile — `order` CSS doesn't affect reading order, so check screen reader flow)
- [ ] Story panel reads before form in DOM on mobile → correct
- [ ] All form fields have associated labels (`<label>` wrapping or `for`/`id` pair)
- [ ] Error messages use `role="alert"`
- [ ] Button disabled state communicated (`aria-disabled` or native `disabled`)
- [ ] Turnstile has its own accessibility implementation (Cloudflare's responsibility)
- [ ] Color contrast: gray-10 on yellow-90 ≥ 4.5:1 ✓; white on gray-10 ≥ 4.5:1 ✓

## Design Token Candidates

These patterns from this design could be promoted to global tokens:

| Pattern                        | Candidate token                                |
| ------------------------------ | ---------------------------------------------- |
| `oklch(0.85 0 0)` input border | `--border-input`                               |
| Story panel background         | `--surface-brand` → `var(--yellow-90)`         |
| High-contrast button           | Already `--gray-10` / global `.button-primary` |

Evaluate in a follow-up design system pass.

---

_Generated by Design Lab · Variant B · 2026-06-06_
