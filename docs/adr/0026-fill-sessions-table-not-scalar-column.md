# fill_sessions table, not a scalar column on patients

To back the new home screen's "Last filled: `<date>`" (ADR-0025), we added a `fill_sessions` table (`id`, `patient_id`, `completed_at`) rather than a single `last_fill_session_completed_at` column on `patients`.

## Why

Today's need is only the most recent completion date. A scalar column on `patients` would satisfy that with less code. But `CONTEXT.md`'s Adherence Record entry already commits to a future need for "Fill Session history (including any refill flags raised)" — a per-session record, not a single latest value. Shipping a scalar column now would mean replacing it with a table later and discarding the interim data (a single date carries no session-by-session history to migrate forward).

`fill_sessions` is deliberately minimal today — no organizer type, no refill flags, no snapshot of what was filled — but its shape (one row per completed session) won't need to change when that future work lands; only new columns will.
