# Pillbug API

Document new routes here before implementing them. This is a living contract — update it when implementation reveals gaps, not a spec that must be perfect before any code is written. The goal is that the doc always reflects current reality, not that it prevents iteration.

## Conventions

- All request bodies are JSON (`Content-Type: application/json`)
- All JSON responses include `Content-Type: application/json`
- Errors always return `{ "error": "<code>" }` — never bare strings or HTML
- Authentication uses an `HttpOnly; SameSite=Lax` session cookie named `session` (30-day TTL)
- Token TTL: 20 minutes (magic link validity window)

---

## Routes

### `GET /api/health`

Reports subsystem reachability. Always returns 200.

**Response**

```json
{ "db": "ok" | "error", "email": "ok" | "error" }
```

`db: "ok"` means D1 is reachable and the required tables (`patients`, `magic_link_tokens`, `sessions`) exist.
`email: "ok"` means the Resend API key is valid.

---

### `POST /api/register`

Creates a new Patient account and sends a magic link. If the email is already registered, silently sends a login link instead (email enumeration protection — the response is identical either way).

**Request**

```json
{ "email": "patient@example.com", "turnstileToken": "..." }
```

**Response — 200**

```json
{ "ok": true }
```

**Response — 403** (Turnstile verification failed)

```json
{ "error": "invalid_turnstile_token" }
```

The Turnstile token is obtained from the widget rendered on the `/register` page. If Cloudflare's verification API rejects the token (bot detected, token expired, or token already used), the server returns 403. The client should prompt the user to try again — the widget will issue a fresh token automatically.

---

### `POST /api/login`

Sends a magic link to an existing Patient. If the email is not registered, returns `{ ok: true }` with no email sent (email enumeration protection).

**Request**

```json
{ "email": "patient@example.com" }
```

**Response — 200**

```json
{ "ok": true }
```

---

### `GET /api/auth/verify?token=<token>`

Redeems a magic link token. Single-use; tokens expire after 20 minutes.

**Response — success** (302)
Redirects to `/`. Sets `session` cookie (HttpOnly, SameSite=Lax, 30-day TTL).

**Response — failure** (302)
Redirects to `/register?error=<code>` where `<code>` is one of:

| Code      | Meaning                         |
| --------- | ------------------------------- |
| `invalid` | Token not found                 |
| `used`    | Token already redeemed          |
| `expired` | Token past its 20-minute window |

---

### `POST /api/logout`

Destroys the current session. Safe to call without a valid session (no-op).

**Response — 302**
Redirects to `/register`. Clears the `session` cookie.

---

### `GET /api/session`

Returns the current session state. Used by the client to check auth on page load (the service worker may serve cached HTML to unauthenticated users, so a network check is required).

**Response — 200** (authenticated)

```json
{ "ok": true, "patientId": "<uuid>" }
```

**Response — 401** (no session or expired session)

```json
{ "error": "not_authenticated" }
```

---

## Unauthenticated redirect

`GET /` without a valid session cookie → 302 to `/register`.

All other unauthenticated requests to non-API routes are served as static assets (the SPA handles its own routing).
