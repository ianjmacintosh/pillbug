-- Email encryption migration: replace plaintext email with HMAC lookup + AES-GCM ciphertext.
--
-- Existing patient records cannot be migrated (EMAIL_SECRET is not available in SQL
-- migrations). Sessions and tokens are cleared as well since they reference patients.
-- Users must re-register after deployment.
PRAGMA foreign_keys = ON;

DROP TABLE sessions;
DROP TABLE magic_link_tokens;
DROP TABLE patients;

CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  email_lookup TEXT UNIQUE NOT NULL,
  email_encrypted TEXT NOT NULL,
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
