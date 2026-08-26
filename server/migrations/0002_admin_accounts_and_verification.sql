-- Replaces the single shared ADMIN_TOKEN with real admin accounts, adds an
-- audit trail for admin actions, and extends doctor verification with
-- proper metadata (who verified/rejected, when, and why) plus protection
-- against duplicate HPCSA registrations.

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'support_admin',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

DO $$ BEGIN
  ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('super_admin', 'verification_admin', 'support_admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS admin_sessions_admin_idx ON admin_sessions(admin_id);

-- admin_email/admin_role are denormalized snapshots so the log stays
-- meaningful even if the admin account is later deactivated or removed.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_resource_idx ON admin_audit_log(resource_type, resource_id);

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verified_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE doctors ADD CONSTRAINT doctors_verification_status_check
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One HPCSA number can only ever belong to one doctor account. Case- and
-- whitespace-insensitive so "MP123456", "mp123456 ", and "Mp123456" all
-- collide. Blank/NULL values (shouldn't occur post-registration, but old
-- seeded/demo rows may lack one) are excluded from the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS doctors_hpcsa_number_unique_idx
  ON doctors (LOWER(TRIM(hpcsa_number)))
  WHERE hpcsa_number IS NOT NULL AND TRIM(hpcsa_number) <> '';
