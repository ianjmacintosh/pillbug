# Claude Code guidance for Pillbug

## API design

Document new Worker routes in `docs/api.md` before implementing them. The contract is the source of truth — frontend and backend can be built independently against it.

## Environment variables and secrets

When adding or removing an env var or secret, update all of these together:

1. `.env.EXAMPLE` — the canonical list of all vars and their local dev values
2. The relevant `.github/workflows/` file — so CI stays in sync with local setup
3. GitHub repo settings — add or remove the secret under Settings → Secrets and variables → Actions
4. `docs/testing.md` — if the change involves test keys or test-only values

Failing to update the workflow or repo settings is a common miss: local tests pass, CI breaks because the worker is missing a binding it depends on.

## Debugging CI failures

If the same CI job has failed twice for the same root cause, stop and read the official docs for the relevant subsystem before committing another change. Iterating without authoritative grounding is slow and expensive.

## Pull requests

### Test plans

Lead every PR test plan by stating how verification works — automated (CI), manual steps, or both. Without this, reviewers can't tell whether to wait for CI, run commands locally, or click through the UI.

Example framing:

- "All tests are automated — verify CI passes. No manual steps required."
- "CI covers unit tests; manually verify the UI flow below."
