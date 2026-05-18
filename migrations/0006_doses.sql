PRAGMA foreign_keys = ON;

CREATE TABLE doses (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
