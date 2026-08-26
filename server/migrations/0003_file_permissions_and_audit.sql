-- Fixes the patient-file permission model: receiving a file (being a
-- transfer's to_doctor_id) granted the same access as the transfer's
-- from_doctor_id, which meant any doctor a file had ever been forwarded to
-- could forward it again to anyone else — an uncontrolled forwarding chain
-- with no re-authorisation. Ownership (the uploader) is now the only
-- doctor who can transfer a file onward; a transfer recipient gets
-- view/download only. Also adds a consent record on each transfer and a
-- file access audit log (upload/view/download/transfer/denied).

ALTER TABLE file_transfers ADD COLUMN IF NOT EXISTS consent_basis TEXT;
ALTER TABLE file_transfers ADD COLUMN IF NOT EXISTS consent_confirmed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS file_access_log (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES patient_files(id) ON DELETE CASCADE,
  doctor_id TEXT REFERENCES doctors(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS file_access_log_file_idx ON file_access_log(file_id, created_at DESC);
CREATE INDEX IF NOT EXISTS file_access_log_doctor_idx ON file_access_log(doctor_id, created_at DESC);
