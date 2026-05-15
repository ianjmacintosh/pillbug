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

## Email mock (E2E tests)

`npm run test:e2e` sets `EMAIL_MOCK=true` and `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` in the script definition. `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` tells the Cloudflare Vite plugin to expose all process environment variables as Worker bindings, so `EMAIL_MOCK=true` reaches the Worker's `env` object.

When `env.EMAIL_MOCK === "true"`, the worker uses a no-op email sender for `/api/register` and `/api/login` — no HTTP requests are made to `api.resend.com`. The health check endpoint calls `resend.domains.list()` as normal (that call is quota-free and is intentionally not mocked).

Do not set `EMAIL_MOCK` in `.env`, staging, or production.
