# Privacy Policy / EULA Notes

Running list of architectural decisions that must be reflected in the privacy policy and EULA. Add to this file whenever a new decision has a privacy disclosure implication.

---

## Data storage — Cloudflare D1

All patient data (Prescriptions, Doses, Fill Sessions, Doctors, Schedules, Reminders) is stored in Cloudflare D1 (SQLite on Cloudflare's infrastructure). Cloudflare encrypts data at rest. Cloudflare is a sub-processor; name them explicitly and link their DPA once signed.

**Disclosure required:** Where patient data is stored, that Cloudflare handles infrastructure, and that data is encrypted at rest.

## Email delivery — Resend

Patient email addresses are shared with Resend (a third-party email delivery service) solely to send magic link login emails. Resend receives the recipient address and delivery metadata only — no medical content.

**Disclosure required:** Resend is a named sub-processor. State the limited purpose (magic link login only) and that no medical content is transmitted to Resend.

## Push notifications — Web Push API (self-hosted, VAPID)

Reminders (push notifications containing medication names and scheduled times) and end-of-course Prescription notifications are delivered via the browser Web Push API using VAPID keys. Pillbug does not use any managed notification service (e.g. OneSignal). Browser push infrastructure (Google FCM for Chrome, Mozilla Autopush for Firefox, Apple APNs for Safari) is involved in delivery as a transport layer — this is inherent to the Web Push standard and outside Pillbug's control.

Subscribing to Reminders stores a push subscription token in Pillbug's database. This token is used solely to deliver push notifications and is deleted when the patient unsubscribes or deletes their account.

**Disclosure required:** How push notifications are delivered, that no third-party notification service holds patient data, and that a push subscription token is stored per patient.

## Account deletion

Patients have the right to permanently and immediately delete their account and all associated data. Deletion is not soft — no data is retained after a deletion request.

**Disclosure required:** Explicit right to deletion, that it is permanent, and the mechanism for requesting it (in-app).

## Data export

Patients can download all their data in machine-readable format (JSON) at any time from within the app.

**Disclosure required:** Right to data portability, format (JSON), and how to access it.

## No selling, no advertising

Pillbug does not sell patient data, share it for advertising purposes, or use it for any purpose beyond operating the app for the patient.

**Disclosure required:** Explicit, unambiguous statement that data is never sold or used for advertising.

## EU / GDPR (deferred)

EU data residency (Cloudflare Data Localization Suite) is not configured for the initial launch. If EU patients are onboarded in the future, this section must be updated and the privacy policy must reflect GDPR applicability, lawful basis for processing, and updated sub-processor list.

**Action required before EU launch:** Configure D1 EU residency, sign Cloudflare DPA, update privacy policy.
