# `return_url` threading through Enter Code auth

When a Patient visits a context-bearing URL while logged out (e.g. a Prescription Suggestion link), logging in should return them to that URL rather than dropping them at `/`. We thread a `return_url` parameter through the Enter Code screen: the login/register form captures the current path and passes it to `/enter-code?token=<uuid>&return_url=<path>`. After a successful PIN submission the EnterCode component redirects to `return_url` instead of `/`.

The main trade-off accepted: `return_url` must be validated client-side to prevent open redirect attacks — only same-origin paths are allowed.

## Considered options

- **Always redirect to `/` after verify** — rejected: loses context when the Patient arrived at a specific URL while logged out (e.g. a Prescription Suggestion). The Patient would need to locate the original link again, breaking the intended Doctor → Patient flow.
- **`return_url` threaded through Enter Code screen URL** — chosen: the path survives as a query param on the Enter Code URL and is read by the client after successful verification. Validates to same-origin only to prevent open redirects.
- **Store intended destination in a cookie or session before redirect** — rejected: adds server-side state for a problem solvable in the URL itself; more complex with no benefit.
