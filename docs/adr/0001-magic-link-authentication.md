# Magic link authentication over OAuth or passwords

Pillbug handles personal health data (medication schedules, dose history). We chose magic link email authentication over OAuth ("Sign in with Google/Apple") because linking health data to a major platform account felt like an uncomfortable pairing for this category of app — patients may not want their prescription habits associated with their Google identity. We rejected passwords because they add management burden (reset flows, storage, hashing) without meaningful benefit over magic links for a solo-patient app. The main trade-off accepted: patients must have access to their email to log in, and the login flow requires leaving the app briefly.

## Considered Options

- **OAuth (Google/Apple)** — rejected: ties health data to a third-party identity provider; platform dependency; privacy concern for health-sensitive data.
- **Email + password** — rejected: password management complexity (reset flows, secure storage) with no advantage over magic links for this use case.
- **SMS / phone number** — rejected: per-message cost, requires phone number collection, no meaningful UX advantage over email for a web app.
