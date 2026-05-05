# CI: GitHub Actions

Every PR runs the following checks automatically. Do not add these as manual steps in a PR test plan.

| Workflow         | File                                    | Command                |
| ---------------- | --------------------------------------- | ---------------------- |
| Unit tests       | `.github/workflows/unit-tests.yml`      | `npm run test:unit`    |
| End-to-end tests | `.github/workflows/e2e-tests.yml`       | `npm run test:e2e`     |
| Formatting       | `.github/workflows/static-analysis.yml` | `npm run format:check` |
| Lint             | `.github/workflows/static-analysis.yml` | `npm run lint`         |
| TypeScript       | `.github/workflows/static-analysis.yml` | `npm run typecheck`    |

## What belongs in a PR test plan

Only steps that require human judgment or can't be automated — for example:

- Visual or UX review of a UI change
- Verifying a production build artifact looks correct (`npm run build`)
- Confirming a third-party integration works end-to-end in a staging environment
