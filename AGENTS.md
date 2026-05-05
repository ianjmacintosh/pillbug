## Agent skills

### Issue tracker

Issues live in GitHub Issues (uses the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### CI

Unit tests, e2e tests, formatting, lint, and TypeScript are all checked automatically on every PR by GitHub Actions. Do not add these to PR test plans. See `docs/agents/ci.md` for the full list and guidance on what belongs in a test plan.
