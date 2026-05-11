# `return_url` threading through magic link auth

When a Patient visits a context-bearing URL while logged out (e.g. a Prescription Suggestion link), logging in should return them to that URL rather than dropping them at `/`. We thread a `return_url` parameter through the magic link flow: the login/register form captures the current path, encodes it into the magic link as a query param, and `GET /api/auth/verify` redirects to `return_url` instead of `/` when one is present.

The main trade-off accepted: `return_url` must be validated server-side to prevent open redirect attacks — only same-origin paths are allowed.

## Considered options

- **Always redirect to `/` after verify** — rejected: loses context when the Patient arrived at a specific URL while logged out (e.g. a Prescription Suggestion). The Patient would need to locate the original link again, breaking the intended Doctor → Patient flow.
- **`return_url` in magic link** — chosen: the path survives the round-trip through email and is restored after auth. Validates to same-origin only to prevent open redirects.
- **Store intended destination in a cookie or session before redirect** — rejected: adds server-side state for a problem solvable in the URL itself; more complex with no benefit.
