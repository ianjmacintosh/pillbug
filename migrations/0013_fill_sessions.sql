PRAGMA foreign_keys = ON;

CREATE TABLE fill_sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL
);
