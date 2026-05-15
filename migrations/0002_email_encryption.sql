-- Recreate patients table with encrypted email columns replacing plaintext email.
-- Standard SQLite table-rename pattern; foreign_keys must be off during the swap.

PRAGMA foreign_keys=off;

CREATE TABLE patients_new (
  id TEXT PRIMARY KEY,
  email_lookup TEXT UNIQUE NOT NULL,
  email_encrypted TEXT NOT NULL,
  terms_accepted_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

DROP TABLE patients;
ALTER TABLE patients_new RENAME TO patients;

PRAGMA foreign_keys=on;
