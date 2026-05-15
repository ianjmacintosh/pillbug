# Email encryption at rest

Patient email addresses are encrypted at rest rather than stored in plaintext. Knowing someone uses a medication-tracking app is itself sensitive information — per the Privacy by Default principle, an email address in plaintext is readable by anyone with D1 access alone, which is an unacceptable single point of exposure for the most sensitive identifier in the system.

The `patients` table uses two columns in place of a plaintext `email` column:

- `email_lookup` — HMAC-SHA256 of the plaintext email, used for indexed lookup (`WHERE email_lookup = ?`)
- `email_encrypted` — AES-GCM ciphertext of the plaintext email, with the nonce prepended, used to recover the plaintext when needed

Both keys are derived via HKDF from a single `EMAIL_SECRET` master secret, using distinct context strings so the HMAC key and AES-GCM key are cryptographically independent. Decrypting stored emails requires `EMAIL_SECRET` separately from D1 access — an attacker must compromise both independently. (Someone with Worker deploy access could exfiltrate `EMAIL_SECRET` at runtime, so encryption raises the bar without eliminating all risk.)

## Considered options

- **Full table scan** — rejected: O(n) lookup on every auth request is unacceptable at any meaningful scale.
- **AES-SIV** — rejected: not available in the Web Crypto API; would require a third-party library. HMAC + AES-GCM achieves equivalent security using only built-in primitives, at the cost of a second column.

## Key rotation

Key rotation is deferred. Rotation requires re-encrypting every `email_encrypted` row (a full-table migration) and is operationally complex to do safely. There is no current compliance requirement driving it. The trigger for future rotation would be suspected or confirmed `EMAIL_SECRET` compromise.
