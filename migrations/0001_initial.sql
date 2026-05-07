-- Run with: npx wrangler d1 migrations apply pillbug --local

CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  terms_accepted_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE magic_link_tokens (
  token TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
