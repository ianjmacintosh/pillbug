# Claude Code guidance for Pillbug

## Pull requests

### Test plans

Lead every PR test plan by stating how verification works — automated (CI), manual steps, or both. Without this, reviewers can't tell whether to wait for CI, run commands locally, or click through the UI.

Example framing:

- "All tests are automated — verify CI passes. No manual steps required."
- "CI covers unit tests; manually verify the UI flow below."
