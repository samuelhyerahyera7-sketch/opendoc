import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true })

export const uploadsDir = path.join(dataDir, 'uploads')

export const db = new DatabaseSync(path.join(dataDir, 'opendoc.db'))

db.exec(`
  PRAGMA journal_mode = WAL;

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
    bio TEXT,
    education TEXT,
    languages TEXT,
    accepting_new INTEGER DEFAULT 1,
    rating REAL DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS doctor_insurances (
    doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    insurance TEXT NOT NULL,
    PRIMARY KEY (doctor_id, insurance)
  );

  CREATE TABLE IF NOT EXISTS doctor_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_label TEXT NOT NULL,
    time_label TEXT NOT NULL,
    is_booked INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
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
    new_patient INTEGER DEFAULT 1,
    day_label TEXT NOT NULL,
    time_label TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS patient_files (
    id TEXT PRIMARY KEY,
    uploading_doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_first_name TEXT NOT NULL,
    patient_last_name TEXT NOT NULL,
    patient_email TEXT,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS file_transfers (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL REFERENCES patient_files(id) ON DELETE CASCADE,
    from_doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    to_doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT DEFAULT 'sent',
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

export default db
