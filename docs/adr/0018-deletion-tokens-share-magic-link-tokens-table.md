# ADR-0018: Deletion Tokens share the magic_link_tokens table with a `purpose` column

**Date**: 2026-05-26
**Status**: Accepted

## Context

Account Deletion requires re-authenticating the Patient via their registered email before the account is permanently erased. The confirmation flow is structurally identical to the existing magic-link auth flow: an email is sent containing a pre-filled link and a 4-digit Verification Code; the Patient enters the code on a dedicated screen; the token is validated, marked used, and an action executes.

This raised the question of whether to store Deletion Tokens in the existing `magic_link_tokens` table or in a separate `deletion_tokens` table.

## Decision

Deletion Tokens are stored in `magic_link_tokens` with a new `purpose TEXT NOT NULL DEFAULT 'auth'` column. Auth tokens have `purpose = 'auth'`; Deletion Tokens have `purpose = 'deletion'`.

Each endpoint that redeems a token checks `purpose` before acting:

- `POST /api/v1/auth/verify-pin` rejects any token where `purpose != 'auth'`
- `POST /api/v1/account/confirm-deletion` rejects any token where `purpose != 'deletion'`

This prevents cross-redemption: a Deletion Token cannot create a session, and an auth token cannot delete an account.

## Alternatives considered

**Separate `deletion_tokens` table** — cleaner semantic separation, but all columns would be identical to `magic_link_tokens` (`token`, `patient_id`, `expires_at`, `used_at`, `pin_hash`, `failed_attempts`). Duplicating the schema for what is structurally the same concept adds migration and maintenance overhead with no behavioral difference. The existing cron job that purges expired and used tokens would also need to be extended to cover the new table.

## Consequences

- One migration adds the `purpose` column with `DEFAULT 'auth'` — existing rows are unaffected.
- The `findToken` repository method returns `purpose` alongside the existing fields; callers are responsible for checking it.
- Any future token type (e.g., email-change confirmation) follows the same pattern: new `purpose` value, new endpoint, same table.
