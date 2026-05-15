# Mock Resend requests for E2E tests

## Summary

Add an env-var-controlled no-op email sender so E2E tests don't make real Resend API calls.

## Background

E2E tests run against a real wrangler dev server. When the auth flow is exercised (register, login), the worker instantiates a live Resend client and sends API requests to `api.resend.com`. The tests use `@resend.dev` test addresses, so no actual email delivery is needed — but the API calls still count against Resend's daily sending quota.

The health check endpoint calls `resend.domains.list()`, which is a management API call. It does not count against the email sending quota and should not be mocked. Resend offers no dedicated health/status endpoint; the only alternative compatible with a `sending_access`-scoped key would be an actual email send, which would consume quota. The current health check approach is intentional.

## Desired behavior

When a designated env var (e.g. `EMAIL_MOCK=true`) is set, the worker should route all email send operations through a no-op `EmailSender` implementation that returns success without making any outbound HTTP request to Resend.

The mock env var should be active only during E2E test runs — not in local dev, staging, or production.

## Key interfaces

- `EmailSender` — the existing interface (`sendMagicLink(to, token)`) already models the abstraction. A no-op implementation should satisfy it by returning immediately without side effects.
- Worker `Env` — add the new env var so the worker can read it. Follow the CLAUDE.md env var checklist: update `.env.EXAMPLE`, CI workflow, both Cloudflare Worker environments, GitHub repo secrets, and `docs/testing.md` if applicable. This var is not sensitive — treat it as a plain var, not a secret, in wrangler configuration.
- Playwright `webServer` config — the E2E dev server startup must inject the mock env var so it is visible to the worker at test time (not just to the test process). The wrangler dev process needs to see it.

## Acceptance criteria

- [ ] Running the full E2E suite makes zero HTTP requests to `api.resend.com` for the register and login flows
- [ ] All existing E2E auth tests pass (register → token in DB → verify flow)
- [ ] The health check endpoint is unchanged — it continues to call Resend as normal
- [ ] The mock env var is absent from `.dev.vars.example` defaults (or clearly marked test-only), and is not set in staging or production wrangler config
- [ ] All existing unit tests continue to pass
- [ ] The new no-op sender is not used in any non-test code path

## Out of scope

- Mocking Resend in unit tests (already handled via `vi.mock`)
- Mocking the health check's Resend call (see Background above)
- Intercepting or asserting on the content of emails in E2E tests
- Any changes to the actual Resend sending logic for non-mock environments
- Adding new E2E test scenarios beyond what currently exists
