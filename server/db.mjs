import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Point it at a Postgres database — e.g. a local one for dev, or the ' +
      'connection string from your Vercel Postgres / Neon integration in production.',
  )
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
})

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      credentials TEXT NOT NULL,
      specialty TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      photo TEXT,
      address TEXT,
      city TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      bio TEXT,
      education JSONB,
      languages JSONB,
      accepting_new BOOLEAN DEFAULT TRUE,
      accepts_cash BOOLEAN DEFAULT TRUE,
      rating REAL DEFAULT 5.0,
      review_count INTEGER DEFAULT 0,
      hpcsa_number TEXT,
      verification_status TEXT DEFAULT 'pending',
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hpcsa_number TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS doctor_insurances (
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      insurance TEXT NOT NULL,
      PRIMARY KEY (doctor_id, insurance)
    );

    CREATE TABLE IF NOT EXISTS doctor_slots (
      id SERIAL PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      day_label TEXT NOT NULL,
      time_label TEXT NOT NULL,
      is_booked BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS patient_sessions (
      token TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    -- Single-use tokens for patient email verification and password reset,
    -- mirroring action_tokens (which is doctor-only).
    CREATE TABLE IF NOT EXISTS patient_action_tokens (
      token TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      slot_id INTEGER REFERENCES doctor_slots(id),
      patient_first_name TEXT NOT NULL,
      patient_last_name TEXT NOT NULL,
      patient_email TEXT NOT NULL,
      patient_phone TEXT NOT NULL,
      reason TEXT,
      new_patient BOOLEAN DEFAULT TRUE,
      day_label TEXT NOT NULL,
      time_label TEXT NOT NULL,
      status TEXT DEFAULT 'confirmed',
      review_token TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS review_token TEXT UNIQUE;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS patient_files (
      id TEXT PRIMARY KEY,
      uploading_doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      patient_first_name TEXT NOT NULL,
      patient_last_name TEXT NOT NULL,
      patient_email TEXT,
      original_name TEXT NOT NULL,
      storage_url TEXT NOT NULL,
      storage_path TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS file_transfers (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL REFERENCES patient_files(id) ON DELETE CASCADE,
      from_doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      to_doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      message TEXT,
      status TEXT DEFAULT 'sent',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- One review per appointment, left by the patient after their visit.
    -- Real, doctor-specific reviews replace the old hardcoded sample text.
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      patient_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Single-use tokens for email verification and password reset.
    CREATE TABLE IF NOT EXISTS action_tokens (
      token TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );

    -- In-app notifications for doctors: new bookings, files received,
    -- verification decisions, new reviews.
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      link TEXT,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS notifications_doctor_idx ON notifications(doctor_id, created_at DESC);

    -- In-app notifications for patients: booking confirmations, and future
    -- doctor-initiated changes (reschedule/cancel) once those exist.
    CREATE TABLE IF NOT EXISTS patient_notifications (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      link TEXT,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS patient_notifications_patient_idx ON patient_notifications(patient_id, created_at DESC);
  `)
}

export default pool
