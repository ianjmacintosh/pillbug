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

### `GET /api/v1/health`

Reports subsystem reachability. Always returns 200.

**Response**

```json
{ "db": "ok" | "error", "email": "ok" | "error" }
```

`db: "ok"` means D1 is reachable and the required tables (`patients`, `magic_link_tokens`, `sessions`) exist.
`email: "ok"` means the Resend API key is valid.

---

### `POST /api/v1/register`

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

### `POST /api/v1/login`

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

### `GET /api/v1/auth/verify?token=<token>`

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

### `POST /api/v1/logout`

Destroys the current session. Safe to call without a valid session (no-op).

**Response — 302**
Redirects to `/register`. Clears the `session` cookie.

---

### `GET /api/v1/session`

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

### `POST /api/v1/login/silent`

Creates a Patient account if the email is not registered, then generates a magic link token without sending an email. The token is written to the database and can be retrieved via `wrangler d1 execute` for use at `GET /api/v1/auth/verify`. Intended for local and staging developer workflows — see `npm run dev:login`.

**Request**

```json
{ "email": "patient@example.com" }
```

**Response — 200**

```json
{ "ok": true }
```

---

## Prescription endpoints

All Prescription endpoints require a valid session cookie. Unauthenticated requests return 401.

A Prescription object has the following shape:

```json
{
  "id": "<uuid>",
  "drugName": "Metformin",
  "dosage": "500mg",
  "schedule": {
    "days": "daily" | ["monday", "tuesday", ...],
    "times": ["08:00", "20:00"],
    "timezoneMode": "local" | "fixed_utc"
  },
  "startDate": "2024-01-01",
  "endDate": "2024-06-01",
  "prescribingDoctor": "Dr. Smith",
  "instructions": "Take with food",
  "status": "active" | "completed" | "paused" | "discontinued"
}
```

`endDate`, `prescribingDoctor`, and `instructions` are optional and may be `null`. `startDate` and `endDate` are ISO 8601 date strings (`YYYY-MM-DD`). `timezoneMode` defaults to `"local"` if omitted on create.

---

### `GET /api/v1/v1/prescriptions`

Returns the authenticated Patient's Prescriptions.

**Query parameters**

| Parameter | Type                   | Default  | Description                                                                                                       |
| --------- | ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `status`  | comma-separated string | `active` | Filter by status. Valid values: `active`, `completed`, `paused`, `discontinued`. Example: `?status=active,paused` |
| `doctor`  | string                 | —        | Filter by exact match on `prescribingDoctor` field. Optional.                                                     |

**Response — 200**

```json
[{ ...Prescription }, ...]
```

Empty array if no Prescriptions match the filters.

**Response — 401**

```json
{ "error": "not_authenticated" }
```

---

### `POST /api/v1/v1/prescriptions`

Creates a new Prescription for the authenticated Patient. Status defaults to `active`.

**Request**

```json
{
  "drugName": "Metformin",
  "dosage": "500mg",
  "schedule": {
    "days": "daily" | ["monday", "tuesday", ...],
    "times": ["08:00", "20:00"],
    "timezoneMode": "local" | "fixed_utc"
  },
  "startDate": "2024-01-01",
  "endDate": "2024-06-01",
  "prescribingDoctor": "Dr. Smith",
  "instructions": "Take with food"
}
```

Required: `drugName`, `dosage`, `schedule`, `startDate`. All other fields are optional.

**Response — 201**

The created Prescription object.

**Response — 400** (missing required field)

```json
{ "error": "missing_required_field" }
```

**Response — 422** (semantically invalid)

| Code                         | Meaning                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `end_date_before_start_date` | `endDate` is earlier than `startDate`                                          |
| `invalid_status`             | `status` value is not a recognised enum value                                  |
| `invalid_time_format`        | A time in `schedule.times` is not `HH:MM`                                      |
| `invalid_days`               | `schedule.days` is not `"daily"` or a non-empty array of valid weekday strings |

---

### `GET /api/v1/v1/prescriptions/:prescriptionId`

Returns a single Prescription. Returns 404 whether the Prescription does not exist or belongs to a different Patient — the response is identical either way (existence is not confirmed).

**Response — 200**

The Prescription object.

**Response — 404**

```json
{ "error": "not_found" }
```

---

### `PATCH /api/v1/v1/prescriptions/:prescriptionId`

Updates a Prescription. Only fields included in the request body are changed; omitted fields are left as-is.

**Request**

Any subset of Prescription fields:

```json
{
  "drugName": "Metformin HCL",
  "dosage": "1000mg",
  "status": "discontinued"
}
```

**Response — 200**

The updated Prescription object.

**Response — 404**

```json
{ "error": "not_found" }
```

**Response — 422**

Same error codes as `POST /api/v1/v1/prescriptions`.

---

### `DELETE /api/v1/v1/prescriptions/:prescriptionId`

Permanently deletes a Prescription and all associated Dose history. This operation is irreversible.

**Response — 200**

```json
{ "ok": true }
```

**Response — 404**

```json
{ "error": "not_found" }
```

---

### `GET /api/v1/v1/doctors`

Returns the distinct doctor names associated with the authenticated Patient's Prescriptions. Accepts the same `status` filter as `GET /api/v1/v1/prescriptions` so the caller can keep the doctor picker in sync with the visible Prescription list.

**Query parameters**

| Parameter | Type                   | Default  | Description                                    |
| --------- | ---------------------- | -------- | ---------------------------------------------- |
| `status`  | comma-separated string | `active` | Same values as `GET /api/v1/v1/prescriptions`. |

**Response — 200**

```json
[{ "name": "Dr. Smith" }, { "name": "Dr. Jones" }]
```

Empty array if no matching Prescriptions have a `prescribingDoctor` set.

**Response — 401**

```json
{ "error": "not_authenticated" }
```

---

## Unauthenticated redirect

`GET /` without a valid session cookie → 302 to `/register`.

All other unauthenticated requests to non-API routes are served as static assets (the SPA handles its own routing).
