PRAGMA foreign_keys = ON;

ALTER TABLE prescriptions ADD COLUMN dose_count DECIMAL NOT NULL DEFAULT 1;
ALTER TABLE prescriptions ADD COLUMN dose_form TEXT NOT NULL DEFAULT 'tablet';
