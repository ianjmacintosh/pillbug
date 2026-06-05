# Product

## Register

product

## Users

Patients managing their own prescription medication schedules in daily life. Not clinicians, not enterprise users — a person who takes medications and wants to stay on track without juggling recurring phone alarms.

Primary context: at home near a pill organizer, checking the app while planning the week or taking doses. The app is personal, private, and used solo.

Job to be done: know what to take and when, confirm it was taken, and keep prescription records organized. The fill session workflow (loading the weekly pill organizer) is a recurring ritual — it should feel smooth and reliable, not a chore.

## Product Purpose

Pillbug helps patients follow their prescribed medication schedules. It replaces ad-hoc phone alarms and calendar reminders with a schedule-aware system: weekly dose views, fill session support, push reminders, and prescription records — all in one place.

Success looks like a patient who never misses a dose because the app made it easy to stay on track, not because they had to fight the interface.

## Brand Personality

Warm, personal, friendly. Built for a real person by someone who cares — not a form you file at the hospital. Approachable without being a lifestyle brand. The tone is like a helpful friend who also happens to know about your medications.

Typography references point toward rounded, friendly display faces (Coiny, Sour Gummy, Short Stack for headlines; Stack Sans or Prompt for body) — legible and warm, with personality.

The yellow accent already in the codebase (`--yellow-90: oklch(0.9 0.4 95)`) carries the warmth signal. The icon green (`#2d6a4f`) is currently disconnected from the token system and is worth reconciling.

Note: the Register, Login, Terms, and Privacy pages are the brand-facing public surfaces. They receive brand-register treatment; the authenticated app receives product-register treatment.

## Anti-references

- **Clinical/hospital UI**: cold blue-and-white, EHR aesthetic, form-heavy institutional look. The app should never feel like a health system portal.
- **Wellness/spa**: soft gradients, pastel greens, mindfulness-app vibes. Too soft — this is for managing medications, not booking a yoga class.
- **Gamified health apps**: streaks, badges, progress bars, neon accents. Medication adherence is serious; don't trivialize it with game mechanics.

## Design Principles

1. **Privacy by default** — The burden is always on revealing, not concealing. Sensitive information should be hidden unless the patient actively chooses to show it. Every UI decision starts with: what is the minimum information needed here?
2. **Warm without clinical** — Friendly and human, without being a wellness or lifestyle brand. The interface should feel like it was made for a specific person, not a category of users.
3. **Reliable clarity** — When managing medication, getting information right and fast is non-negotiable. Clarity and legibility come before decoration.
4. **Personal, not institutional** — Interactions should feel like a well-designed personal tool, not a hospital form. Copy is direct and human; layouts breathe.
5. **Accessible always** — Medication management is health-critical. The patient base may include older users and people with vision concerns. WCAG AA is the floor, not the ceiling.

## Accessibility & Inclusion

WCAG AA baseline. Keyboard navigation and screen reader support throughout. Design for older patients and users with reduced visual acuity — body text contrast and sizing should err on the side of legibility over elegance. Reduced motion support required for all animations.
