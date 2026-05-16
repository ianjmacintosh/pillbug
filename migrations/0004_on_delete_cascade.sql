-- Recreate magic_link_tokens and sessions with ON DELETE CASCADE so that
-- deleting a patient row automatically removes their tokens and sessions.
-- SQLite does not support ALTER TABLE to modify FK constraints, so we rename,
-- recreate, copy, and drop.
PRAGMA foreign_keys = ON;

ALTER TABLE magic_link_tokens RENAME TO magic_link_tokens_old;
CREATE TABLE magic_link_tokens (
  token TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
INSERT INTO magic_link_tokens SELECT * FROM magic_link_tokens_old;
DROP TABLE magic_link_tokens_old;

ALTER TABLE sessions RENAME TO sessions_old;
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
INSERT INTO sessions SELECT * FROM sessions_old;
DROP TABLE sessions_old;
