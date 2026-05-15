# Claude Code guidance for Pillbug

## Issue workflow

Before starting work on a GitHub issue:

1. Create (or check out) a feature branch named `{issue-number}-{kebab-case-issue-title}` — e.g. `57-mock-resend-requests-for-e2e-tests`.
2. Mark the issue as **In progress** (move it to the "In progress" column, or apply the label, depending on how the project board is configured).

Never do issue work directly on `main`.

For tiny or hotfix work that doesn't warrant a formal issue, use a short descriptive branch name without an issue number — e.g. `fix-old-port-refs` or `add-docs-for-deep-link-feature`.

## API design

Document new Worker routes in `docs/api.md` before implementing them. The contract is the source of truth — frontend and backend can be built independently against it.

## Environment variables and secrets

Only add a secret to any environment when the worker code actually references it. Don't pre-provision secrets for planned features.

When adding or removing an env var or secret, update all of these together:

1. `.env.EXAMPLE` — the canonical list of all vars and their local dev values
2. The relevant `.github/workflows/` file — so CI stays in sync with local setup
3. Both Cloudflare Workers environments (`pillbug` and `pillbug-staging`) — they must carry the same set of secret names; values may differ (e.g. staging uses Turnstile test keys)
4. GitHub repo settings — add or remove the secret under Settings → Secrets and variables → Actions
5. `docs/testing.md` — if the change involves test keys or test-only values
6. Cloudflare build environment variables — for any `VITE_` prefixed variable, set it in the Cloudflare dashboard build settings for both environments (these are baked into the frontend bundle at build time, not available to the Worker at runtime)

Staging and production must have the same secret names. CI runs against staging — a secret missing from staging breaks CI (good catch). A secret missing from production but present in staging lets CI pass while production breaks (the dangerous direction).

## Debugging CI failures

If the same CI job has failed twice for the same root cause, stop and read the official docs for the relevant subsystem before committing another change. Iterating without authoritative grounding is slow and expensive.

## Pull requests

### Test plans

Lead every PR test plan by stating how verification works — automated (CI), manual steps, or both. Without this, reviewers can't tell whether to wait for CI, run commands locally, or click through the UI.

Example framing:

- "All tests are automated — verify CI passes. No manual steps required."
- "CI covers unit tests; manually verify the UI flow below."
