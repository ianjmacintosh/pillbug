# Pillbug API

Document new routes here before implementing them. This is a living contract — update it when implementation reveals gaps, not a spec that must be perfect before any code is written. The goal is that the doc always reflects current reality, not that it prevents iteration.

## Conventions

- All request bodies are JSON (`Content-Type: application/json`)
- All JSON responses include `Content-Type: application/json`
- Errors always return `{ "error": "<code>" }` — never bare strings or HTML
- Authentication uses an `HttpOnly; SameSite=Lax` session cookie named `session` (30-day TTL)
- Token TTL: 20 minutes (Verification Code validity window)

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

Creates a new Patient account and sends a verification email with a 4-digit PIN. If the email is already registered, silently sends a verification email instead (email enumeration protection — the response is identical either way).

**Request**

```json
{ "email": "patient@example.com", "turnstileToken": "...", "language": "en-US" }
```

`language` is optional. The frontend sends the react-i18next resolved locale (e.g. `"en-US"`, `"pt-BR"`). Unknown, missing, or non-string values fall back to `"en-US"`. The value is stored on the new `patients` row and used to select the language for the verification email.

**Response — 200**

```json
{ "ok": true, "token": "<uuid>" }
```

The client uses `token` to construct the `/enter-code?token=<uuid>` URL for the next step.

**Response — 403** (Turnstile verification failed)

```json
{ "error": "invalid_turnstile_token" }
```

The Turnstile token is obtained from the widget rendered on the `/register` page. If Cloudflare's verification API rejects the token (bot detected, token expired, or token already used), the server returns 403. The client should prompt the user to try again — the widget will issue a fresh token automatically.

---

### `POST /api/v1/login`

Sends a sign-in email with a 4-digit PIN to an existing Patient. If the email is not registered, stores a decoy token (no `patient_id`, no email sent) and returns its UUID — the token returns `invalid` if submitted, preserving email enumeration protection.

**Request**

```json
{ "email": "patient@example.com", "turnstileToken": "..." }
```

**Response — 200**

```json
{ "ok": true, "token": "<uuid>" }
```

The client uses `token` to construct the `/enter-code?token=<uuid>` URL for the next step.

---

### `POST /api/v1/auth/verify-pin`

Verifies a PIN-based token. Single-use; tokens expire after 20 minutes. After 5 failed attempts the token is locked and cannot be retried.

**Request**

```json
{ "token": "<uuid>", "pin": "1234" }
```

**Response — 200** (success)

Sets `session` cookie (HttpOnly, SameSite=Lax, 30-day TTL).

```json
{ "ok": true }
```

**Response — 400** (failure)

```json
{ "error": "invalid" | "expired" | "used" | "locked" }
```

| Code      | Meaning                                      |
| --------- | -------------------------------------------- |
| `expired` | Token not found or past its 20-minute window |
| `invalid` | Token exists but PIN does not match          |
| `used`    | Token already redeemed                       |
| `locked`  | 5 or more failed PIN attempts on this token  |

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

### `GET /api/v1/account`

Returns the authenticated Patient's account data.

**Response — 200**

```json
{
  "timezone": "America/New_York",
  "registrationDate": "2024-01-15",
  "language": "en-US"
}
```

`timezone` is `string | null` — `null` means the patient has not yet set a timezone preference. `registrationDate` is `string | null` in `YYYY-MM-DD` format. `language` is `string | null` — `null` means language was not captured (pre-feature patients); callers should fall back to `"en-US"`.

**Response — 401**

```json
{ "error": "not_authenticated" }
```

---

### `PATCH /api/v1/account`

Updates the authenticated Patient's account settings. Only fields included in the request body are changed.

**Request**

```json
{ "timezone": "America/New_York", "language": "en-US" }
```

Both fields are optional. For `language`: unknown or non-string values fall back to `"en-US"` (no error). If omitted, the stored value is unchanged.

**Response — 200**

```json
{ "ok": true }
```

**Response — 401**

```json
{ "error": "not_authenticated" }
```

**Response — 422** (unrecognised IANA timezone value)

```json
{ "error": "invalid_timezone" }
```

---

### `POST /api/v1/login/silent`

Creates a Patient account if the email is not registered, then generates a token without sending an email. The `dev-login` script patches the DB to set a known PIN (`1234`) and prints the `/enter-code?token=<uuid>` URL for use in a browser. Intended for local and staging developer workflows — see `npm run dev:login`.

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
    "days": {
      "monday": ["08:00", "20:00"],
      "friday": ["08:00"]
    }
  },
  "startDate": "2024-01-01",
  "endDate": "2024-06-01",
  "prescribingDoctor": "Dr. Smith",
  "instructions": "Take with food",
  "status": "active" | "completed" | "paused" | "discontinued"
}
```

`schedule.days` maps each weekday name (`"sunday"` through `"saturday"`) to an array of `HH:MM` dose times for that day. Omitting a day means no dose on that day.

`endDate`, `prescribingDoctor`, and `instructions` are optional and may be `null`. `startDate` and `endDate` are ISO 8601 date strings (`YYYY-MM-DD`).

---

### `GET /api/v1/prescriptions`

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

### `POST /api/v1/prescriptions`

Creates a new Prescription for the authenticated Patient. Status defaults to `active`.

**Request**

```json
{
  "doseCount": 2,
  "doseForm": "tablet",
  "drugName": "Metformin",
  "dosage": "500mg",
  "schedule": {
    "days": { "monday": ["08:00", "20:00"], "friday": ["08:00"] }
  },
  "startDate": "2024-01-01",
  "endDate": "2024-06-01",
  "prescribingDoctor": "Dr. Smith",
  "instructions": "Take with food"
}
```

Required: `drugName`, `dosage`, `schedule`, `startDate`. All other fields are optional. `doseCount` defaults to `1`; `doseForm` defaults to `"tablet"` (accepted values: `tablet`, `capsule`, `pill`, `other`).

**Response — 201**

The created Prescription object.

**Response — 400** (missing required field)

```json
{ "error": "missing_required_field" }
```

**Response — 422** (semantically invalid)

| Code                         | Meaning                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| `end_date_before_start_date` | `endDate` is earlier than `startDate`                                    |
| `invalid_status`             | `status` value is not a recognised enum value                            |
| `invalid_time_format`        | A time in a `schedule.days` entry is not `HH:MM`                         |
| `invalid_days`               | `schedule.days` contains an unrecognised weekday key or is not an object |

---

### `GET /api/v1/prescriptions/:prescriptionId`

Returns a single Prescription. Returns 404 whether the Prescription does not exist or belongs to a different Patient — the response is identical either way (existence is not confirmed).

**Response — 200**

The Prescription object.

**Response — 404**

```json
{ "error": "not_found" }
```

---

### `PATCH /api/v1/prescriptions/:prescriptionId`

Updates a Prescription. Only fields included in the request body are changed; omitted fields are left as-is.

**Request**

Any subset of Prescription fields:

```json
{
  "doseCount": 2,
  "doseForm": "capsule",
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

Same error codes as `POST /api/v1/prescriptions`.

---

### `DELETE /api/v1/prescriptions/:prescriptionId`

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

## Dose endpoints

All Dose endpoints require a valid session cookie. Unauthenticated requests return 401.

A Dose object has the following shape:

```json
{
  "id": "<uuid>",
  "patientId": "<uuid>",
  "prescriptionId": "<uuid>",
  "scheduledAt": "2024-03-11T08:00:00Z",
  "status": "taken" | "missed",
  "loggedAt": "2024-03-11T08:05:00.000Z",
  "createdAt": "2024-03-11T08:05:00.000Z"
}
```

`scheduledAt` is the local clock time of the scheduled dose expressed as a UTC-format timestamp (e.g. `"2024-03-11T08:00:00Z"`). The date and time components correspond to the patient's schedule entry. `loggedAt` is the actual moment the patient logged the dose.

---

### `POST /api/v1/doses`

Records a Dose for the authenticated Patient. `loggedAt` and `createdAt` are set by the server.

**Request**

```json
{
  "prescriptionId": "<uuid>",
  "scheduledAt": "2024-03-11T08:00:00Z",
  "status": "taken" | "missed"
}
```

Required: `prescriptionId`, `scheduledAt`, `status`.

**Response — 201**

The created Dose object.

**Response — 400** (missing required field)

```json
{ "error": "missing_required_field" }
```

**Response — 401**

```json
{ "error": "not_authenticated" }
```

---

### `PATCH /api/v1/doses/:doseId`

Updates the `status` of a previously recorded Dose. Only the authenticated Patient who owns the Dose may update it.

**Request**

```json
{ "status": "taken" | "missed" }
```

**Response — 200**

The updated Dose object.

**Response — 400** (missing required field)

```json
{ "error": "missing_required_field" }
```

**Response — 401**

```json
{ "error": "not_authenticated" }
```

**Response — 404**

```json
{ "error": "not_found" }
```

---

### `DELETE /api/v1/doses/:doseId`

Removes a previously recorded Dose. Only the authenticated Patient who owns the Dose may delete it. Used when a patient unchecks a dose they previously marked as taken.

**Response — 200**

```json
{ "ok": true }
```

**Response — 401**

```json
{ "error": "not_authenticated" }
```

**Response — 404**

```json
{ "error": "not_found" }
```

---

### `GET /api/v1/doses`

Returns the authenticated Patient's logged Doses within a date range.

> **Open question — API unification:** A future design may consolidate `GET /api/v1/doses` and `GET /api/v1/scheduled-doses` into a single endpoint by adding a query parameter (e.g. `status=scheduled`) that switches the response from raw Dose records to the projected Scheduled Dose list. This would make `/scheduled-doses` redundant. Not yet decided — the Adherence Record will likely inform the right shape here.

**Query parameters**

| Parameter | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| `start`   | string | Yes      | Start date `YYYY-MM-DD` (inclusive) |
| `end`     | string | Yes      | End date `YYYY-MM-DD` (inclusive)   |

**Response — 200**

```json
[{ ...Dose }, ...]
```

Empty array if no Doses exist in the range.

**Response — 400** (missing required query parameter)

```json
{ "error": "missing_required_param" }
```

**Response — 401**

```json
{ "error": "not_authenticated" }
```

---

### `GET /api/v1/scheduled-doses`

Returns the authenticated Patient's Scheduled Doses for a date range, projected from their active Prescriptions and resolved against any logged Doses. Only active Prescriptions generate Scheduled Doses.

**Query parameters**

| Parameter | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| `start`   | string | Yes      | Start date `YYYY-MM-DD` (inclusive) |
| `end`     | string | Yes      | End date `YYYY-MM-DD` (inclusive)   |

**Response — 200**

```json
[
  {
    "prescriptionId": "<uuid>",
    "drugName": "Metformin",
    "scheduledAt": "2024-03-11T08:00:00Z",
    "actionable": true,
    "resolvedDose": { "id": "<uuid>", "status": "taken" } | null
  },
  ...
]
```

`actionable` is `false` for Scheduled Doses whose date is after today. `resolvedDose` is non-null when a matching Dose has been logged for that slot.

**Response — 400** (missing required query parameter)

```json
{ "error": "missing_required_param" }
```

**Response — 401**

```json
{ "error": "not_authenticated" }
```

---

### `GET /api/v1/doctors`

Returns the distinct doctor names associated with the authenticated Patient's Prescriptions. Accepts the same `status` filter as `GET /api/v1/prescriptions` so the caller can keep the doctor picker in sync with the visible Prescription list.

**Query parameters**

| Parameter | Type                   | Default  | Description                                 |
| --------- | ---------------------- | -------- | ------------------------------------------- |
| `status`  | comma-separated string | `active` | Same values as `GET /api/v1/prescriptions`. |

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

## Fill Session PDF endpoint

### `GET /api/v1/fill-session/pdf`

Generates and returns a PDF worksheet for the authenticated Patient's current week Fill Session. Requires a valid session cookie.

**Query parameters**

| Parameter   | Type         | Default                   | Description                                                                                                                                                                                                                                                                          |
| ----------- | ------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `organizer` | string       | `"1"`                     | Pill organizer type: `"1"` = Simple 7-day, `"2"` = AM/PM, `"3"` = Morn/Noon/Night, `"4"` = Morn/Noon/Eve/Bed. Invalid or missing values fall back to `"1"`.                                                                                                                          |
| `startDate` | `YYYY-MM-DD` | nearest Sunday from today | Anchor date for the 7-day grid. The grid always runs Sunday → Saturday; days before `startDate` in that order wrap forward to the following week. Missing or invalid values fall back to the nearest Sunday relative to today (using the Patient's stored timezone, UTC if not set). |

**Response — 200**

Binary PDF file.

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Pillbug_Worksheet-2026_09_21-2026_09_27.pdf"
```

Filename format: `Pillbug_Worksheet-{startDate_YYYY_MM_DD}-{endDate_YYYY_MM_DD}.pdf` where `endDate` is `startDate + 6 days` (the chronological span of the session).

**Response — 401**

```json
{ "error": "not_authenticated" }
```

---

## Fill Session progress endpoints

Support resuming an in-progress Fill Session — either after the device locks/sleeps and the tab reloads, or after logging back in from a browser with no session cookie (see `CONTEXT.md`'s Fill Session entry, "Status" note). At most one in-progress Fill Session is tracked per Patient; starting the wizard over (step 1) implicitly replaces any prior progress via upsert.

Progress older than 24 hours is treated as stale and not returned — an abandoned session from weeks ago should not silently redirect a Patient away from `/prescriptions`. The row itself is left in place (no extra write on read) but `GET` reports it as absent.

### `GET /api/v1/fill-session/progress`

Returns the authenticated Patient's in-progress Fill Session, if any and not stale. Requires a valid session cookie.

**Response — 200**

```json
{
  "ok": true,
  "progress": {
    "step": "step3",
    "organizerType": "2",
    "startDate": "2026-08-02",
    "currentIndex": 0,
    "updatedAt": "2026-07-31T14:00:00.000Z"
  }
}
```

```json
{ "ok": true, "progress": null }
```

**Response — 401**

```json
{ "error": "not_authenticated" }
```

### `PUT /api/v1/fill-session/progress`

Upserts the authenticated Patient's Fill Session progress. Called by the wizard on step transitions and on meaningful in-step selection changes (organizer type, Fill Session Start Date, current medicine card index). Requires a valid session cookie.

**Request body**

```json
{
  "step": "step3",
  "organizerType": "2",
  "startDate": "2026-08-02",
  "currentIndex": 0
}
```

| Field           | Type   | Required | Description                                            |
| --------------- | ------ | -------- | ------------------------------------------------------ |
| `step`          | string | yes      | One of `step1`–`step5`.                                |
| `organizerType` | string | yes      | Same values as the Fill Session PDF `organizer` param. |
| `startDate`     | string | yes      | `YYYY-MM-DD` Fill Session Start Date.                  |
| `currentIndex`  | number | yes      | Index of the medicine card the Patient is on.          |

**Response — 200**

```json
{ "ok": true }
```

**Response — 401**

```json
{ "error": "not_authenticated" }
```

**Response — 422**

```json
{ "error": "invalid_step" }
```

### `DELETE /api/v1/fill-session/progress`

Clears the authenticated Patient's Fill Session progress. Called when the wizard reaches Double-check confirmation (the session is complete, so there is nothing left to resume). Requires a valid session cookie.

**Response — 200**

```json
{ "ok": true }
```

**Response — 401**

```json
{ "error": "not_authenticated" }
```

---

## Admin endpoints

The Admin Panel is protected by Cloudflare Access. All requests to `/admin` must carry a valid `Cf-Access-Jwt-Assertion` header. The Worker validates this JWT independently against the JWKS at `{CF_TEAM_DOMAIN}/cdn-cgi/access/certs`. Requests without a valid JWT are rejected with 401 even if they somehow bypass Cloudflare Access (e.g. via the `*.workers.dev` URL).

No per-Patient data is exposed — only aggregate counts.

---

### `GET /admin`

Returns a server-rendered HTML page with three aggregate deployment statistics.

**Authentication**: Cloudflare Access JWT (`Cf-Access-Jwt-Assertion` header, injected by Cloudflare Access)

**Response — 200**

HTML page containing:

- Total registered Patients
- Unverified Patients (registered but not yet verified)
- Active Sessions (sessions where `expires_at` is in the future)

**Response — 401** (missing or invalid JWT)

```
Unauthorized
```

---

## Unauthenticated redirect

`GET /` without a valid session cookie → 302 to `/register`.

All other unauthenticated requests to non-API routes are served as static assets (the SPA handles its own routing).
