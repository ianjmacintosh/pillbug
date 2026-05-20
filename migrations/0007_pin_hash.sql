PRAGMA foreign_keys = ON;

ALTER TABLE magic_link_tokens ADD COLUMN pin_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE magic_link_tokens ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
