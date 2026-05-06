# Roadmap

## Phase 0 — Scaffold (current)

PWA setup, Cloudflare Workers + D1 wiring, CI, and project tooling. No patient-facing features yet. The value here is developer experience: a clean, working starting point that can also serve as a template for future Cloudflare Workers + React + D1 projects (see: alpha-centauri).

The alpha-centauri extraction happens once auth and routing are stable — after that the two repos diverge.

## Phase 1 — Quiet launch

**Goal:** Fill Session workflow usable by one real user.

Step-by-step guidance for filling a pill organizer is a standalone value proposition, independent of Reminders. A Patient can get weekly or monthly value from Pillbug just from this feature.

Issues in dependency order:

- #5 Magic link authentication (+ registration screen)
- #7 Prescription management (Doctor picker deferred — Doctor is optional and not needed for Fill Sessions)
- #15 Pill Organizer setup
- #16 Fill Session workflow

Launch is quiet — one real user working alongside the developer to validate that the workflow holds up in practice before building further.

## Phase 2 — Reminders and adherence

**Goal:** Full medication adherence loop: scheduled Reminders, Dose logging, and a shareable Adherence Record for healthcare providers.

Issues in dependency order:

- #6 Doctor management
- #9 Push notification infrastructure
- #10 Reminder delivery + end-of-course notification
- #11 Reminder resolution + Dose logging
- #12 Dose history + retroactive logging
- #13 Adherence Record view
- #14 Share Link for Adherence Record
- #17 Fill Session history on Adherence Record
