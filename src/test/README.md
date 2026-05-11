# Test infrastructure

## Why mock factories instead of modules?

The Worker creates its dependencies internally on every request:

```typescript
const repo = makeD1AuthRepo(env.DB);        // real D1 database
const emailSender = makeResendEmailSender(…); // real Resend API
const resend = new Resend(env.RESEND_API_KEY); // real Resend client
```

Rather than mocking the `./auth` module's functions (`verifyToken`, `createSession`, etc.), the worker tests mock only the two factory functions and the Resend constructor — the actual system boundaries:

| Mock target             | Replaced with           | Why                                                                |
| ----------------------- | ----------------------- | ------------------------------------------------------------------ |
| `makeD1AuthRepo`        | `makeInMemoryRepo()`    | Same `AuthRepository` interface, no real D1 client needed          |
| `makeResendEmailSender` | `makeEmailSpy().sender` | Captures sent tokens so tests can read them without real API calls |
| `new Resend(…)`         | no-op constructor       | Only passed to `checkHealth`, which is also mocked                 |

Because `makeD1AuthRepo` is mocked to return `makeInMemoryRepo()`, the real `registerPatient`, `verifyToken`, and `createSession` functions run unchanged — they just operate against an in-memory store instead of D1. A bug in those functions will surface in `worker.test.ts`, not just `auth.test.ts`.

## Files

- **`auth-helpers.ts`** — `makeInMemoryRepo` (in-memory `AuthRepository` for tests) and `makeEmailSpy` (captures sent magic-link tokens)
- **`setup.ts`** — Vitest global setup (React Testing Library cleanup)
