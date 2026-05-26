# Cloudflare Access for Admin Panel authentication

The Admin Panel exposes aggregate deployment statistics to the Operator. It must be inaccessible to everyone else — including unauthenticated requests that reach the Worker by bypassing Cloudflare's proxy.

Cloudflare Access (Zero Trust) is placed in front of the `/admin` and `/api/v1/admin/stats` routes on both environments. The Worker independently validates the `Cf-Access-Jwt-Assertion` JWT on every admin request, rejecting anything without a valid signature. This means two independent controls must be bypassed to reach the Admin Panel: Cloudflare Access and the Worker's own JWT check.

Two Access applications are configured — one per domain (`pillbug.ianjmacintosh.com` and `pillbug-staging.ianjmacintosh.com`) — each with its own audience tag (`CF_ACCESS_AUD`). The JWKS endpoint is derived from the shared team domain (`CF_TEAM_DOMAIN`), which is the same across both environments since both Workers belong to the same Cloudflare account.

## Why not an API key / Bearer token?

An API key kept in a password manager achieves a similar result but requires the application to implement rate limiting, revocation, and rotation. Cloudflare Access handles all of this and ties authentication to an existing identity provider (Google, GitHub, etc.), so there is no credential to rotate manually after a compromise.

## Why not reuse the Patient magic-link flow?

The Patient auth flow issues Verification Codes tied to a database record. Reusing it for the Operator would require an Operator `patients` row, conflating two fundamentally different roles. It would also expose the Operator's email address to the same enumeration-protection constraints designed for Patient privacy — inappropriate for an administrative identity.

## Why validate the JWT in the Worker if Access is already in front?

Cloudflare Workers are also reachable at their `*.workers.dev` URL, which bypasses Access. Without Worker-level JWT validation, anyone who discovers the direct Worker URL can reach the Admin Panel unauthenticated. The Worker-level check closes this gap.

## Admin Panel data scope

The Admin Panel shows only aggregate counts (total registered Patients, unverified Patients, active Sessions). No per-Patient data is surfaced — no email addresses, no Patient IDs, no Prescription data. This was an explicit design decision: the email encryption at rest (ADR-0011) protects against DB-level breaches; surfacing decrypted emails in the Admin Panel would collapse that protection into a single point of failure.
