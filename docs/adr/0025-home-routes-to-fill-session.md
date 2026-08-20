# Home routes to Fill Session, not Prescriptions

`/` is now a landing screen for authenticated Patients, leading with a "Start Fill Session" call to action (plus a link to Prescriptions), instead of redirecting straight to `/prescriptions`.

## What this supersedes

ADR-0021 ("Park Scheduled Dose List pending Reminder support") made `/prescriptions` "the effective home" after parking the Scheduled Dose List at `/weekly-doses`. That framing is now superseded: `/prescriptions` remains a first-class, permanent route (per ADR-0022), but it is no longer where the Patient lands by default.

## Why

Caregiver-observation feedback (issue #299) showed Patients returning to the app mid-Fill-Session, landing on Prescriptions, and getting pulled into editing individual medicines there instead of resuming the task they actually opened the app for. `/prescriptions` is a capable destination but not the Patient's primary reason to open Pillbug day to day — filling the Pill Organizer is.

## What we decided against

A hard redirect straight into `/fill-session/step1` (mirroring today's `/` → `/prescriptions` redirect mechanics) was considered and rejected: Fill Session has no resume state, so every app open would silently replay the Disclaimer and Setup screens before showing anything useful. A landing screen with a deliberate "Start" tap avoids that, and keeps a single click's distance from Prescriptions.

## Privacy by Default

The home screen loads unconditionally, with no reveal gate — the same posture ADR-0016 established for `/prescriptions`. This includes the CTA area (last-filled date, Start Fill Session / Add first prescription, Edit Prescriptions) and, as of issue #321, a read-only prescription list (drug name + schedule summary) alongside it, so the Patient can see what they're about to fill without leaving Home.

An earlier draft of #321 gated the prescription list behind a "Show prescriptions" reveal action, reasoning that drug names are exactly what ADR-0016's "not drug names or schedules" carve-out was protecting on `/prescriptions`. That gate was reconsidered and dropped: a Patient reaching `/` is already in the same authenticated, presumed-safe context as `/prescriptions` itself, which has carried the identical content with no gate since ADR-0016. Treating Home differently added a confusing extra interaction (a toggle button with no clear reason to exist) without a correspondingly clear privacy benefit.
