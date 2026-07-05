# Ian's Development Opinions

Synthesized from blog articles at ianjmacintosh.com and the [usdgal/GasCo.st](https://github.com/ianjmacintosh/usdgal) codebase.

---

## Learning & Growth

- Values **learning through rapid experimentation and deliberate mistakes** over waiting for perfect conditions. "Being able to make a bunch of mistakes quickly is a luxury I don't take for granted."
- Prefers **hands-on practice over passive reading**: trying commands yourself beats keeping up mentally. Shallow tutorial-bouncing is an anti-pattern; reading authoritative sources thoroughly is not.
- Treats side projects as a primary vehicle for building real-world intuition — they surface problems that contrived examples don't.

## Simplicity & Anti-Bloat

- Simplicity is an active stance, not a passive preference. "If you don't actively fight for simplicity in software, complexity will win... and it will suck."
- Strongly favors tools that **do exactly one thing well** and nothing else. Actively questions whether more software should follow this philosophy.
- No ads, no registration walls, no unnecessary features. If a feature doesn't serve the user directly, it probably shouldn't exist.
- Accepts awkward syntax or minor technical compromises **if the user-facing result is better** — pragmatism wins over architectural purity.

## Testing

- Regrets skipping tests early; endorses **test-driven development** as an architectural forcing function: it encourages pure functions and surfaces coupling problems before they calcify.
- Favors writing automated tests _before_ implementation to catch requirements you didn't know you'd need. Playwright for E2E; worth doing even for small projects.
- Deeply nested state and prop drilling are symptoms of insufficient upfront design — TDD would have caught them.

## Security

- Security is proactive, not reactive. Prefers **audit-driven discovery** (e.g. Mozilla Observatory) over waiting for incidents.
- Environment variables belong in `.env`, `.env` belongs in `.gitignore`. This is non-negotiable.
- HSTS is worth enabling but warrants deliberate understanding — "if your site's HTTPS implementation breaks somehow, your website will be inaccessible — possibly for a long time."

## Platform Pragmatism

- Adapts to platform constraints rather than fighting them. If Cloudflare silently modifies response headers, configure HSTS at the CDN level — don't waste effort on workarounds that can't win.
- Documents and shares counterintuitive workarounds as a community service, not as platform criticism.
- Realistic about documentation lifespan: UI steps change, so caveats about potential obsolescence are honest, not hedging.

## Dev Environment

- Strongly prefers **isolated, disposable development environments** (dev containers) over accumulating project vestiges on personal systems.
- "Fork, experiment, contribute, move on" — treat exploration as temporary, then contribute the container config back via PR.
- Minimal configuration to start; add complexity only when you need it.

## Verbosity & Explicitness

- Prefers **explicit over implicit** in examples: include the record type even when it's the default, spell out flags rather than relying on shorthand.
- Concrete working examples (actual manifest files, actual test code, actual commands) beat abstract guidance.

## Mobile & UX Polish

- Pays genuine attention to mobile details. `min-height: 100dvh` is the right unit for full-height layouts — not `env(safe-area-inset-bottom)`, which addresses display visibility, not page visibility.
- Tests actual cross-platform behavior rather than trusting documentation alone (e.g. confirming Safari icon preference empirically).
- User experience polish — install prompts, icons, descriptions — is worth the effort even for modest apps.

## Tooling Skepticism

- Abandoned or unmaintained libraries are a warning sign, not just a minor inconvenience.
- Evaluates libraries on **visual output at actual usage size**, not theoretical accuracy. "Excessively accurate detail at inaccurate scale" is worse than simplified representations that look right.
- Moment.js is probably overkill for simple date formatting — acknowledges this, uses it anyway for familiarity, and says so honestly.

## Documentation Philosophy

- Good documentation includes the _why_ behind technical choices, not just the _what_.
- Wishes he'd found the right article before spending hours on trial-and-error — so he writes the article he wished existed.
- Prefers trailing slashes in permalink values (in Eleventy at least); omitting them caused silent breakage that was hard to debug.

## Accessibility

- Treats accessibility as a first-class concern, not a retrofit. Reaches for accessibility-first component libraries (Ariakit) rather than unstyled primitives or ad-hoc ARIA attributes.
- Uses ARIA roles in tests as the primary selection strategy — both because it's the right selector priority and because it proves the UI is semantically correct.

## State Management

- Prefers React's built-in primitives (useReducer + Context) over external state libraries when they're sufficient. Doesn't reach for Redux unless the complexity genuinely demands it.
- Reducer + context pattern scales well for moderate complexity and keeps business logic testable in isolation.

## Native-First for Browser APIs

- Reaches for `Intl.NumberFormat`, `Intl.DateTimeFormat`, and related browser APIs before pulling in date/number formatting libraries. The platform already knows the user's locale.
- Corollary: locale-adaptive UX (decimal separators, currency display, date styles) should derive from actual browser/OS settings, not hardcoded defaults.

## Automation & CI

- Automates the tedious parts of maintenance: nightly GitHub Actions to refresh exchange rates, Dependabot for dependency updates, Coveralls for coverage tracking.
- Multiple specialized CI workflows (unit tests, E2E, static analysis, coverage) are preferable to one monolithic job — they give faster, clearer failure signals.
- Prefers automated enforcement over manual reminders: Husky pre-commit hooks + lint-staged so formatting is never a PR comment.
- Tracks coverage as an ongoing signal, not a trophy. Knowing _where_ you're uncovered matters as much as having tests at all.

## Component Organization

- Co-locates a component's CSS, implementation, and tests in a single folder. Keeps related things together; avoids scattered `__tests__` directories.

## Intelligent Defaults Over Configuration

- The best UX figures out what the user probably wants and sets it up for them — currency, language, and unit all initialize from geolocation and browser signals. Don't make users configure what the context already reveals.
- Corollary: when the app _can't_ infer what to do (e.g., a US user who is already home), make a reasonable guess anyway rather than leaving them with a blank state.

## User Preferences Without Accounts

- Persist what matters for the user without asking them to sign up. localStorage for gas prices, language preference, and location state gives continuity without a registration wall.
- Ties to the anti-bloat stance: accounts are a feature with real cost to users; skip them when persistence can be achieved another way.

## Numeric Honesty

- Rounding a non-zero value to zero is a lie. If `0.00001 USD` would display as `0.00`, show `0.01` instead — the smallest _true_ representation for the currency's decimal places.
- Precision loss should be surfaced, not silently swallowed. Warn users when rounding distorts a value significantly rather than hiding it behind a tidy display.

## Engineering Leadership Identity

- Self-identifies as an Engineering Leader focused on developer experience — DevOps, preview environments, Git practices, efficient code review, practical documentation.
- Security and pentesting (OverTheWire, TryHackMe, HackTheBox) are personal interests, not just job requirements. Security curiosity runs deep.
