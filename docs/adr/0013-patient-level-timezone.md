# Patient-level timezone; times stored as local HH:MM

Timezone is a Patient-level setting, not a per-Prescription field. Schedule times are stored as local HH:MM values and interpreted using the Patient's stored timezone at Reminder fire time.

## Context

The original Schedule model included a `timezoneMode` field with two values: `local` (use the Patient's current timezone) and `fixed_utc` (fire Reminders at an absolute UTC time regardless of location). The intent was to support travellers taking medications where exact UTC timing matters — e.g. a drug that must be taken every 12 hours on the dot.

In practice, the `timezoneMode` field was never exposed in the UI (always defaulted to `local`) and the motivating case (strict UTC adherence for travellers) is sufficiently rare that it adds design and implementation complexity without paying for itself at this stage.

## Decision

Timezone is a single Patient-level preference (IANA string, e.g. `America/New_York`), auto-detected from the browser on first session and editable in Settings. All schedule times are stored as HH:MM local values and interpreted using the Patient's timezone. Reminder delivery converts local time → UTC using the Patient's timezone at fire time.

The `timezoneMode` key in existing `prescriptions.schedule` JSON is legacy — it is written as `"local"` in all existing records and is now ignored by the application.

## Why Patient-level, not per-Prescription

A single Patient rarely needs different timezone semantics for different Prescriptions. A per-Prescription toggle adds a concept to teach, a field to show in every Create/Edit form, and a branching code path in Reminder delivery — for a use case that serves almost no one. If the need ever emerges (e.g. a snowbird with a prescription set to fire at the same absolute UTC time), it can be added as an opt-in per-Prescription override at that point.

## Consequences

- `patients` table needs a `timezone` column (nullable TEXT, IANA string). Reminder delivery falls back to UTC when null.
- The `timezoneMode` field should be removed from the `Schedule` TypeScript interface and no longer written by new code.
- Settings screen must expose timezone detection and manual override.
- `GET /api/v1/prescriptions` and related endpoints do not need to change — timezone is only relevant at Reminder fire time.

## Rejected alternative

**`fixed_utc` per-Prescription mode**: Rejected. The motivating use case (medication requiring strict UTC adherence across timezones) is real but rare, and designing for it now adds complexity before there is a single user who needs it.
