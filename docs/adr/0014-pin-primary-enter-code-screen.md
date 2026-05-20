# PIN-primary Enter Code screen for verification and login

Verification and login both previously relied solely on the Patient clicking a magic link in their email. This required the Patient to open their email on the same device they wanted to use the app on. A usability problem emerged: Patients who habitually check email on their phone but wanted to use the app on a desktop had no path to authenticate on their preferred device.

We introduced a 4-digit Verification Code and an Enter Code screen as the primary authentication path. The email carries the code for manual entry alongside a pre-filled link (`/enter-code?token=<uuid>&pin=<code>`) that auto-submits on click — both paths go through the same `POST /api/v1/auth/verify-pin` endpoint. The separate `GET /api/v1/auth/verify` magic link route was removed; there is now a single verification path.

## Decisions

**PIN-primary, magic link as in-email fallback only.** The Enter Code screen is the default post-registration and post-login destination. The magic link is not surfaced on the Enter Code screen — it appears only in the email as a "can't enter the code?" escape hatch. Presenting both options equally on-screen was rejected as likely to confuse Patients about which to use.

**4-digit numeric Verification Code.** Short enough to transcribe easily from a phone screen to a desktop. The small keyspace (10,000 combinations) is mitigated by the 5-attempt lockout and the 20-minute token TTL. A longer code would reduce brute-force risk marginally but increase transcription friction meaningfully for a health-sensitive context where the Patient may be reading from one device while typing on another.

**Code scoped to token, not email.** The Enter Code screen carries the token in its URL (`/enter-code?token=<uuid>`). The PIN submission sends `{ token, pin }` — the token narrows the search space to a single active credential, making brute-force across multiple accounts impossible without also knowing the token UUID.

**HMAC-SHA256 for code storage.** Consistent with the existing `email_lookup` pattern. Faster than bcrypt, appropriate for a short-lived credential that expires in 20 minutes. The `pin_hash` column is added to `magic_link_tokens`.

**5-attempt lockout applies to all paths.** After 5 failed code entries, `failed_attempts` reaches 5 and the token is permanently locked — subsequent attempts (typed or via the pre-filled link) return `{ error: "locked" }`. Because the in-email link carries the Verification Code in the URL and resolves through the same endpoint, lockout blocks both. A locked Patient's only path forward is to request a new code from `/login`. This is acceptable: the lockout is per-token, not per-account, and the 20-minute TTL already limits the damage window.

**Four distinct error states: `invalid`, `expired`, `used`, `locked`.** Each maps to a specific UI message on the Enter Code screen. `used` means the token was already redeemed (likely via magic link on another device); `locked` means too many failed code entries. Collapsing these into a single error was rejected because the recovery path differs: `used` → "you may already be logged in elsewhere, log in here"; `locked` → "too many attempts, request a new link."

**Same flow for registration and login.** Both redirect to `/enter-code?token=<uuid>` after form submission. Only the email copy differs. Diverging the two flows was rejected as added complexity with no benefit.

## Considered alternatives

- **Longer code (6 digits):** Marginally more brute-force resistant, but the cross-device transcription cost felt higher than the incremental security gain given the lockout already limits attempts to 5.
- **Globally unique PIN (no token in URL):** Would require a longer or more complex code to be safe across all active sessions. Rejected in favour of scoping to token, which keeps the code short without sacrificing security.
- **Require email re-entry alongside PIN:** Rejected because the token in the URL already scopes the lookup; the email adds friction without adding security in this design.
- **Keep a separate magic link route immune to lockout:** The original design included `GET /api/v1/auth/verify` as a lockout-immune escape hatch. Rejected in favour of a single verification path: since the in-email link carries the Verification Code in the URL anyway, both paths share the same credential and the same lockout. A locked Patient goes to `/login` to request a fresh token rather than having a bypass route that weakens the lockout guarantee.
