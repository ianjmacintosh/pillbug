PRAGMA foreign_keys = ON;

-- Recreate magic_link_tokens with patient_id nullable (for decoy tokens on unknown emails)
CREATE TABLE magic_link_tokens_new (
  token TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  pin_hash TEXT NOT NULL DEFAULT '',
  failed_attempts INTEGER NOT NULL DEFAULT 0
);

INSERT INTO magic_link_tokens_new SELECT token, patient_id, expires_at, used_at, pin_hash, failed_attempts FROM magic_link_tokens;

DROP TABLE magic_link_tokens;
ALTER TABLE magic_link_tokens_new RENAME TO magic_link_tokens;
