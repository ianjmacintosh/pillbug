# Cloudflare D1 as the database

Pillbug runs on Cloudflare Workers. We chose D1 (SQLite at the edge) over an external Postgres host (Neon, Supabase) or Cloudflare Durable Objects.

D1 is a native Workers binding — no external host, no credentials to manage, no network hop from Workers to a separate database service. The data model is relational (Patients, Prescriptions, Doses, Doctors, Fill Sessions) and D1's SQLite dialect handles it without issue. The free tier (5 GB, 25 M row reads/day) is generous for a personal health tracking app.

External Postgres adds latency (Workers-to-external-host round trip) and a second service to operate. Durable Objects are not suited for relational data.

## Privacy commitments baked in at design time

Two features must be implemented before any Patient data is accepted:

- **Account deletion** — a Patient can delete their account and have all their data permanently removed from D1.
- **Data export** — a Patient can download all their data in a machine-readable format (JSON).

These are not future-roadmap items; they are design constraints.

## Deferred

EU data residency (Cloudflare Data Localization Suite, paid) is deferred until EU expansion is a concrete plan. No EU-only D1 location will be configured for now.

## Considered Options

- **Cloudflare D1** — chosen: zero-config edge binding, stays fully within the Cloudflare stack, free tier sufficient, SQLite handles the relational model.
- **External Postgres (Neon/Supabase)** — rejected: adds a network hop and a second service to manage; query power not needed at this scale.
- **Cloudflare Durable Objects** — rejected: not suited for relational data across multiple entity types.
