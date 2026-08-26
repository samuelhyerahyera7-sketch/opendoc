import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pool from './db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

// Applies every .sql file in server/migrations that hasn't already run, in
// filename order, each inside its own transaction. Safe to call on every
// server start — already-applied migrations are skipped via the
// schema_migrations table, so this is the replacement for the old
// "CREATE TABLE IF NOT EXISTS everything on every boot" approach: schema
// changes are now explicit, ordered, and reviewable files instead of an
// ever-growing single function.
export async function runMigrations() {
  await ensureMigrationsTable()
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
  const { rows } = await pool.query('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.name))

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`[migrate] applied ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`[migrate] failed on ${file}`)
      throw err
    } finally {
      client.release()
    }
  }
}

// Allow running standalone: `node server/migrate.mjs`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[migrate] up to date')
      return pool.end()
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
