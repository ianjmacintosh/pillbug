# Testing

## Email addresses

Always use Resend's official test addresses in tests — never invented addresses like `user@example.com`. These addresses simulate specific delivery outcomes without sending real email:

| Address                 | Simulates              |
| ----------------------- | ---------------------- |
| `delivered@resend.dev`  | Successful delivery    |
| `bounced@resend.dev`    | Hard bounce (SMTP 550) |
| `complained@resend.dev` | Spam complaint         |
| `suppressed@resend.dev` | Suppressed address     |

All support `+` labels (e.g., `delivered+signup@resend.dev`) for distinguishing scenarios within a single test run.

## Cloudflare Turnstile

Use Cloudflare's dummy keys for local development and CI — never the real site/secret keys. The always-passes pair is appropriate for most tests:

| Key type   | Value                                 | Behavior      |
| ---------- | ------------------------------------- | ------------- |
| Site key   | `1x00000000000000000000AA`            | Always passes |
| Secret key | `1x0000000000000000000000000000000AA` | Always passes |
| Site key   | `2x00000000000000000000AB`            | Always fails  |
| Secret key | `2x0000000000000000000000000000000AA` | Always fails  |

The always-passes widget produces a dummy token: `XXXX.DUMMY.TOKEN.XXXX`. This token is only accepted by the test secret key — production secret keys reject it.

The test secret key is hardcoded in `e2e-tests.yml` (it is a publicly documented Cloudflare value, not a real credential). The production and staging secret keys are set as Cloudflare Worker secrets via `wrangler secret put TURNSTILE_SECRET_KEY --env <environment>` and must also be stored in GitHub repo secrets if a deploy workflow reads them.

## Database migrations and local-vs-remote D1 differences

CI applies migrations with `--local` (a local SQLite file) to keep the remote staging database clean during test runs. Local SQLite and remote D1 have behavioral differences that can cause a migration to pass CI and then fail in production:

| Behavior                      | Local SQLite (`--local`) | D1 remote                |
| ----------------------------- | ------------------------ | ------------------------ |
| Foreign key enforcement       | Off by default           | On by default            |
| Query timeout                 | None                     | 30 seconds               |
| Bound parameters per query    | Unlimited                | 100                      |
| Queries per Worker invocation | Unlimited                | 1,000 (paid) / 50 (free) |

The foreign key gap is the most dangerous for migrations. When FK enforcement is off, `DROP TABLE` succeeds even if other tables reference it — the child rows become orphaned silently. When FK enforcement is on, the same `DROP TABLE` fails immediately with a constraint error. The fix is to drop child tables first, removing FK references before dropping the parent.

**Before merging any PR that includes a migration**, verify it against a remote D1 database. Opening the PR triggers the Cloudflare GitHub integration, which deploys a preview environment connected to D1 and applies migrations there. Confirm the preview environment is healthy — this is where FK constraint failures and timeout issues will surface.

## CI coverage gaps

The E2E suite runs against a local Wrangler dev server with local SQLite. It does not run against the deployed staging or production Workers. This is intentional for speed and isolation, but it creates blind spots:

| Scenario                                                                                                              | Caught by CI? | How to catch it                                                |
| --------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------- |
| Missing `CLOUDFLARE_ENV` at build time → no D1 binding                                                                | No            | Manual registration smoke test on staging after deploy         |
| Missing `VITE_TURNSTILE_SITE_KEY` at build time → broken Turnstile widget                                             | No            | Manual registration smoke test on staging after deploy         |
| Turnstile site key not authorized for deployed hostname (error 110200)                                                | No            | Manual registration smoke test on staging after deploy         |
| Wrong `RESEND_API_KEY` / `EMAIL_SECRET` / `PIN_SECRET` / `TURNSTILE_SECRET_KEY` / `CLOUDFLARE_ENV` on deployed Worker | No            | Manual registration smoke test on staging after deploy         |
| Migration passes local SQLite but fails on remote D1 (FK enforcement)                                                 | No            | Check Cloudflare preview environment health after PR is opened |

**Recommended pre-production checklist:**

1. After deploying to staging, attempt a full registration flow on the staging URL
2. Confirm the magic link email arrives and the verify link creates a session
3. For PRs containing migrations, confirm the Cloudflare preview environment deployed successfully and is healthy (see migration section above)

A future improvement would be a separate Playwright job that runs against the deployed staging Worker URL (not localhost) after each staging deploy, using Resend test addresses and the staging Turnstile keys.

## Email mock (E2E tests)

`npm run test:e2e` sets `EMAIL_MOCK=true` and `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` in the script definition. `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` tells the Cloudflare Vite plugin to expose all process environment variables as Worker bindings, so `EMAIL_MOCK=true` reaches the Worker's `env` object.

When `env.EMAIL_MOCK === "true"`, the worker uses a no-op email sender for `/api/register` and `/api/login` — no HTTP requests are made to `api.resend.com`. The health check endpoint calls `resend.domains.list()` as normal (that call is quota-free and is intentionally not mocked).

Do not set `EMAIL_MOCK` in `.env`, staging, or production.

## Admin panel mock (local dev only)

`CF_ACCESS_MOCK` bypasses Cloudflare Access JWT validation on `GET /admin`, allowing the admin panel to be accessed without a real Access session. This is useful during local development where Cloudflare Access is not in front of the Worker.

To enable it, add to your local `.env` (for `npm run dev`) or `.dev.vars` (for `npm run dev:wrangler`):

```
CF_ACCESS_MOCK=true
```

Both files are gitignored. Do not set `CF_ACCESS_MOCK` in `wrangler.jsonc`, staging, or production.

Even if `CF_ACCESS_MOCK` were set in a real environment, it would have no effect: the bypass is only active when the request arrives over HTTP. Production and staging are always HTTPS, so `CF_ACCESS_MOCK` is silently ignored there regardless of its value.
