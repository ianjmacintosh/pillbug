# Pillbug API

Document new routes here before implementing them. The contract is the source of truth — frontend and backend implement against it independently.

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
{ "email": "patient@example.com", "inviteCode": "..." }
```

**Response — 200**

```json
{ "ok": true }
```

**Response — 403** (invalid invite code)

```json
{ "error": "invalid_invite_code" }
```

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

## Unauthenticated redirect

`GET /` without a valid session cookie → 302 to `/register`.

All other unauthenticated requests to non-API routes are served as static assets (the SPA handles its own routing).
