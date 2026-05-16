# CI owns staging deploy with remote E2E health check

CI is responsible for deploying to staging and running a Playwright suite against the live staging URL after each deploy. Cloudflare Workers Builds is not used as the primary deployer.

## Context

A production outage occurred because the `@cloudflare/vite-plugin` requires `CLOUDFLARE_ENV` to be set at build time to flatten the correct Wrangler environment config (including the D1 binding) into `dist/pillbug/wrangler.json`. This variable was not set in the Cloudflare Workers Builds dashboard. The deployed Worker had no D1 binding and crashed with `TypeError: Cannot read properties of undefined (reading 'prepare')` on every database request.

The underlying problem is that CI ran tests against a local dev server. A local test suite cannot catch missing Cloudflare build environment variables, wrong secrets, Turnstile domain authorization failures, or any other class of environment misconfiguration. The outage went undetected until production traffic hit it.

## Decision

CI owns the staging deploy. After static analysis, unit tests, and local E2E tests pass, CI builds the Worker with `CLOUDFLARE_ENV=staging` set explicitly in the workflow step env, deploys to staging via `wrangler deploy --env staging`, and then runs a Playwright suite (`playwright.staging.config.ts`) against the live staging URL.

The staging Playwright config uses the real staging base URL and has no `webServer` block. It starts minimal — the `/api/health` smoke test — and grows to cover more surface area over time.

## Why CI must own the deploy for the health check to mean anything

If CI runs a health check against "whatever is currently at the staging URL," it tests a stale deployment. The check is only meaningful if CI deployed the build being checked. Two independent deployers (CI and Cloudflare Builds) also means two places where `CLOUDFLARE_ENV` must be configured correctly, which recreates the original problem.

## Rejected alternatives

**Pre-build check script (`scripts/check-build-env.js`)**: Rejected as the primary fix. A static checklist catches known unknowns — it would not have prevented this outage on its own (the variable needed to be set first), and it will not catch the next unknown missing variable. Added maintenance with no detection coverage for novel misconfigurations.

**Direct D1 access from CI (`wrangler d1 execute --remote`)**: Considered as a mechanism for retrieving magic link tokens in remote E2E auth tests. Rejected because it grants CI broad database access — a violation of least privilege, and a dangerous pattern if the scope ever expanded to production.

**Test-only Worker endpoint for token retrieval**: Considered for the same purpose. Deferred — not needed for the initial health check scope, and introduces application-level backdoor complexity that warrants its own decision when auth E2E against staging is tackled.

**Move D1 binding to root `wrangler.jsonc`**: Rejected — already rejected by ADR 0007. A production deploy without `CLOUDFLARE_ENV` silently writing to the staging database is a worse failure mode than crashing.

**Keep Cloudflare Workers Builds as deployer, run health check separately**: Rejected. Separating deploy from health check means the check tests a potentially stale build, and leaves `CLOUDFLARE_ENV` as a dashboard setting that can silently go missing — the exact failure mode that caused the outage.
