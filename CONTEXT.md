# Pillbug

A web app that helps patients track and follow their prescribed medication schedules, with a shareable view for healthcare providers.

## Design Principles

**Privacy by Default**:
The app discloses as little information as necessary, and the burden is always on revealing rather than concealing — like a spring-hinged door that closes itself. Patients should never have to take an explicit action to hide something sensitive; sensitive information should be hidden unless the Patient actively chooses to show it.

This principle applies at every layer:

- _Auth_: auth endpoints never confirm whether an email address is registered (email enumeration protection), because knowing someone uses a medication-tracking app is itself sensitive.
- _Prescription visibility_: a Patient should be able to use the app with someone looking over their shoulder without sensitive Prescriptions being visible by default. See Prescription visibility in Flagged ambiguities.

When designing a new feature, ask: what is the minimum information needed here, and what is the least-surprising default for a Patient who hasn't thought about privacy?

## Language

**Patient**:
The person who takes medications and uses the app to manage their own schedule. Authenticates via magic link email.
_Avoid_: User, account, client

**Registration**:
The one-time flow a new Patient completes to create their account. Consists of: entering their email address and explicitly accepting the Terms of Service and Privacy Policy. Submitting the form sends a magic link to the provided email. Registration is a distinct screen from Login — not a silent side-effect of first login.
_Avoid_: Sign up, Onboarding (onboarding is a separate concept if it exists), Account creation
_Privacy_: The registration endpoint returns `{ ok: true }` whether the email is new or already registered (silently sending a login link in the latter case). Per Privacy by Default: confirming whether an email is registered reveals that someone uses a medication-tracking app, which is sensitive in itself.

**Prescription**:
A medication a clinician has directed the Patient to take on a schedule.
_Avoid_: Medication (too generic — doesn't imply a schedule or clinical directive), Task, Regimen Item

Fields: drug name (free text with autocomplete), dosage (free text, e.g. "10mg"), schedule (see **Schedule**), start date (required), end date (optional), prescribing Doctor (optional), instructions (optional free text), status (Active, Completed, Paused, or Discontinued).

Status values: **Active** (generating Reminders), **Completed** (reached end date), **Paused** (temporarily suspended, expected to resume), **Discontinued** (stopped early, will not resume). Paused and Discontinued preserve Dose history — a Prescription is never deleted.

**Schedule**:
The set of clock-based times at which a Patient should take a Prescription, on specified days of the week or every day.
_Avoid_: Recurrence, Timetable, Frequency

Fields: days (all days, or specific days of the week), times of day (one or more clock times), timezone mode (local — follows Patient's current timezone; or fixed UTC — Reminders fire at an absolute UTC time regardless of where the Patient is). Local is the default; fixed UTC is an advanced setting for medications requiring strict interval adherence across timezones.

**Doctor**:
A healthcare provider optionally associated with one or more Prescriptions. Private to each Patient. Required field: name. Optional fields: phone, address, email.
_Avoid_: Provider, Clinician, Physician

**Dose**:
A recorded instance of a Patient taking or missing a Prescription at a specific time. Has a status: taken or missed.
_Avoid_: Administration, Intake, Log Entry
_Note_: "Dose" also refers to the prescribed amount (dosage) — use supporting context to disambiguate (e.g., "log a Dose", "your 8am Dose" vs. "dosage: 10mg").

**Reminder**:
A push notification sent to the Patient at a scheduled time prompting them to take a Prescription.
_Avoid_: Alert, Notification, Alarm

Resolution flow: Patient is asked "Did you take it?" (Yes / No). "Yes" logs a taken Dose. "No" presents a second screen: "Snooze" or "Ignore." "Ignore" logs a missed Dose.

**Snooze**:
A Patient action that defers a Reminder by 9 minutes (alarm clock convention), causing it to re-fire. Does not log a Dose.

**Pill Organizer**:
A physical multi-compartment container used by the Patient to pre-sort medications by day and time of day. The Patient configures their Pill Organizer's structure in the app (Compartments per day: 1, 2, or 4; span: 7-day or longer).
_Avoid_: Pill box, Dosette box, Medicine organizer, Weekly planner

**Compartment**:
A single physical slot in a Pill Organizer, identified by day and time of day (e.g., "Monday AM").
_Avoid_: Slot, Cell, Section

**Compartment Mapping**:
A saved Patient decision resolving how a Prescription's scheduled time maps to a specific Compartment when the mapping is ambiguous (e.g., 12:30am could be "late night" PM or "early morning" AM). Prompted inline during the first Fill Session that encounters the ambiguity, with an "Always do this" option to save for future sessions.
_Avoid_: Time assignment, Preference

**Fill Session**:
A guided, step-by-step workflow in which the Patient fills their Pill Organizer for the full span of the organizer (e.g., 7 days). Follows a prescription-by-prescription approach (one Prescription at a time across all Compartments, then move to the next). The Patient can optionally configure a recurring Reminder to prompt Fill Sessions. Workflow steps are provisional pending pharmacist or OT validation.

Steps: (1) Verification — for each active Prescription, the app calculates the required pill count and the Patient confirms Yes/No that they have enough. If No, the app flags a refill is needed but does not block the session. (2) Filling — prescription-by-prescription, the Patient places pills in the listed Compartments. The Patient can confirm each Compartment individually or mark all at once. Ambiguous Schedule-to-Compartment mappings are resolved inline when first encountered, with an option to save as a permanent Compartment Mapping.

If a Fill Session is interrupted and resumed, an Audit step precedes the remaining filling steps: the Patient confirms each previously completed Prescription is still accurate, and verifies no additional pills have been placed in those Compartments.

A completed Fill Session is recorded with a timestamp and which Prescriptions were flagged as needing a refill during verification.
_Avoid_: Packing, Loading, Preparation

**Prescription Suggestion**:
A URL encoding a proposed Prescription that a Doctor sends to a Patient (e.g. via email). Carries: drug name, dosage, instructions, and optionally an end date. Encoded as readable query params (e.g. `?drug=Metformin&dosage=500mg&instructions=Take+with+food`); a motivated Doctor or assistant can construct one by hand without the generator.

Visiting the link:

- **Logged-in Patient**: sees a pre-filled confirmation form. The Prescription is not created until the Patient confirms and fills in the remaining fields (Schedule, start date).
- **Not logged in** (Doctor previewing, or Patient not yet authenticated): sees a read-only preview of the Prescription data and a login link that preserves the current URL. After completing login, the Patient is returned to the same Prescription Suggestion URL and can confirm.

The link is reusable and not bound to a specific Patient. Requires no Pillbug account for the Doctor. Pillbug provides a public **Prescription Suggestion Generator** for constructing the URL.
_Avoid_: Prescription Link (too close to Share Link), Prescription Invite, Rx Template

**Prescription Suggestion Generator**:
A public form on Pillbug for constructing a Prescription Suggestion URL. Accessible without a Pillbug account. Accepts drug name, dosage, instructions, and optional end date, and produces a shareable URL the Doctor can send to a Patient.
_Avoid_: Rx tool, Link builder, Prescription creator

**Adherence Record**:
A read-only view of a Patient's Prescriptions (active and completed), Dose history, and Fill Session history (including any refill flags raised), showing how consistently they have followed their prescribed schedule. Intended for sharing with a healthcare provider.
_Avoid_: Care Summary, Doctor View, Provider Page, Report, Medication History

**Share Link**:
A time-limited URL granting unauthenticated read-only access to a Patient's Adherence Record. Default expiry: 24 hours. Maximum expiry: 30 days. Can be revoked by the Patient at any time.
_Avoid_: Public link, Share URL

## Relationships

- A **Patient** has one or more **Prescriptions**
- A **Prescription** optionally belongs to one **Doctor**
- A **Prescription**'s **Schedule** generates **Reminders**
- When a **Prescription** with an end date expires, the Patient receives an end-of-course notification and the **Prescription** moves to completed status
- A **Reminder** results in a **Dose** (taken), a **Snooze** (deferred), or a dismissal (no Dose logged)
- A **Dose** can be logged retroactively from history, independent of a Reminder
- A **Patient** can generate a **Share Link** to grant read-only access to their **Adherence Record**
- A **Doctor** can generate a **Prescription Suggestion** link that a **Patient** confirms to create a **Prescription**
- A **Patient** optionally has one **Pill Organizer** with a configured structure (Compartments per day, span in days)
- A **Fill Session** covers the full span of the **Pill Organizer** and is recorded on completion

## Flagged ambiguities

- "Medication" vs "Prescription" — resolved: use **Prescription** to capture that the item is clinically directed and schedule-bearing, not just a drug name.
- Exercises / OT activities are explicitly out of scope for now, though the concept of a **Prescription** is intentionally broad enough to accommodate them later.
- Refill reminders are explicitly out of scope for v1. Pill count tracking introduces ongoing maintenance burden (entering counts, updating after refills) better suited to a later iteration.
- Complex schedules (birth control cycles, every-N-hours dosing) are out of scope for v1 — Schedule supports clock-time-based daily/weekly patterns only.
- **Prescription visibility** — unresolved. A Patient showing the app to someone (a doctor, a family member, a friend) may not want all Prescriptions visible (e.g. a prescription they find embarrassing). Per the Privacy by Default principle, sensitive Prescriptions should be hidden unless the Patient chooses to show them. Candidate approach: the Prescription list defaults to showing a filtered or redacted view, with a "Show all" affordance the Patient can tap when alone. The exact mechanism (per-Prescription toggle, session-level reveal, etc.) is an open design problem to be resolved when building the Prescription list view.
