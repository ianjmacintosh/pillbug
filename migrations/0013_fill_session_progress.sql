PRAGMA foreign_keys = ON;

CREATE TABLE fill_session_progress (
  patient_id TEXT PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  organizer_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
