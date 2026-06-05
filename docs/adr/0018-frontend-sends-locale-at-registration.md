# Frontend sends resolved locale in the registration body

At Registration, a Verification Code email is sent before the Patient has a stored language preference. The Worker needs to know which language to use for that email. Rather than parsing the `Accept-Language` request header server-side, the frontend explicitly sends the resolved locale in the registration body.

## Context

The app supports multiple UI languages (initially English and pt-BR). Language preference is stored per-Patient and used for both UI rendering and email content. The earliest email — the Verification Code sent at Registration — goes out before the Patient has completed setup and before any language preference is stored. Some mechanism is needed to communicate the active language to the Worker at that moment.

The browser provides two signals: the `Accept-Language` request header (set by the browser automatically) and the frontend's own resolved locale (determined by react-i18next from `navigator.languages` against the app's supported locales).

## Decision

The registration request body includes a `language` field containing the react-i18next resolved locale (e.g. `"pt-BR"`, `"en"`). The Worker stores this on the `patients` row at creation time and uses it when sending the Verification Code email. The `/finish-setup` call later sends `language` alongside `timezone` in `PATCH /api/v1/account`, updating the stored value if the browser locale has changed since Registration.

## Why not `Accept-Language`

react-i18next resolves `navigator.languages` — the full ordered list of browser locales — against the app's supported locales, normalising `pt-BR`, `pt`, and `pt-*` variants to `"pt-BR"`. Replicating this resolution logic server-side means maintaining a second copy of the supported locale list in the Worker and keeping both in sync as languages are added. Sending the already-resolved value from the frontend avoids that duplication.

The frontend locale also reflects what the Patient actually saw — `Accept-Language` can be set by proxies or corporate network policies and may not match the rendered language.

## Consequences

- The registration endpoint accepts a `language` field in its request body (BCP 47 tag). Unknown or missing values fall back to `"en"`.
- `patients` table gains a `language` column: nullable TEXT, BCP 47 tag. `NULL` means the language was not captured (pre-feature patients); email and UI rendering fall back to `"en"`.
- `/finish-setup` sends `language` alongside `timezone` in the `PATCH /api/v1/account` body.
- `email-sender.ts` functions (`sendVerificationEmail`, `sendLoginEmail`) gain a `language` parameter used to select translated template strings.

## Rejected alternative

**Server reads `Accept-Language` header**: requires server-side locale resolution duplicating the logic already handled by react-i18next, and cannot guarantee the resolved locale matches the language the Patient saw in the UI.
