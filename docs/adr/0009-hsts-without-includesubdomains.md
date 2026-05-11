# HSTS without `includeSubDomains`

The `Strict-Transport-Security` header is set with `max-age=63072000` (two years) but without `includeSubDomains`.

## Why not include `includeSubDomains`?

`includeSubDomains` extends the HSTS policy to every subdomain of the registered domain. The standard recommendation is to include it, but it commits all subdomains — present and future — to HTTPS-only for the full max-age window. Browsers cache this commitment and enforce it client-side; there is no server-side escape hatch once a browser has seen the header.

`mail.pillbug.ianjmacintosh.com` exists as a DNS-only entry (MX and TXT records for Resend) with no web endpoint, so it would not be broken in practice. However, no audit of all subdomains under `ianjmacintosh.com` has been done, and unwinding a two-year HSTS commitment requires waiting for the max-age to expire in every affected browser's HSTS cache.

The conservative choice is to lock the policy to `pillbug.ianjmacintosh.com` only until a deliberate subdomain audit is completed.

## Considered options

- **`max-age=63072000; includeSubDomains`** — rejected: commits all subdomains without a prior audit; hard to reverse if a subdomain needs HTTP.
- **`max-age=63072000`** — chosen: full HSTS protection for the production domain; no cross-subdomain commitment until explicitly reviewed.
