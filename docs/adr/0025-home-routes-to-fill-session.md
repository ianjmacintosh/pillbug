# Home routes to Fill Session, not Prescriptions

`/` is now a landing screen for authenticated Patients, leading with a "Start Fill Session" call to action (plus a link to Prescriptions), instead of redirecting straight to `/prescriptions`.

## What this supersedes

ADR-0021 ("Park Scheduled Dose List pending Reminder support") made `/prescriptions` "the effective home" after parking the Scheduled Dose List at `/weekly-doses`. That framing is now superseded: `/prescriptions` remains a first-class, permanent route (per ADR-0022), but it is no longer where the Patient lands by default.

## Why

Caregiver-observation feedback (issue #299) showed Patients returning to the app mid-Fill-Session, landing on Prescriptions, and getting pulled into editing individual medicines there instead of resuming the task they actually opened the app for. `/prescriptions` is a capable destination but not the Patient's primary reason to open Pillbug day to day — filling the Pill Organizer is.

## What we decided against

A hard redirect straight into `/fill-session/step1` (mirroring today's `/` → `/prescriptions` redirect mechanics) was considered and rejected: Fill Session has no resume state, so every app open would silently replay the Disclaimer and Setup screens before showing anything useful. A landing screen with a deliberate "Start" tap avoids that, and keeps a single click's distance from Prescriptions.

## Privacy by Default

The new home screen loads its content (last-filled date, CTA) unconditionally, with no reveal gate — the same posture ADR-0016 established for `/prescriptions`. The content is limited to a date and a generic action button, not drug names or schedules, so it stays under the bar Privacy by Default sets for bystander-visible information.
