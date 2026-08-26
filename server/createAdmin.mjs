// One-off CLI to create the first (or an additional) admin account, since
// admins can't self-register through the app.
//
// Usage:
//   node server/createAdmin.mjs <email> <password> [role]
//
// role defaults to "super_admin" and must be one of:
//   super_admin | verification_admin | support_admin
import 'dotenv/config'
import crypto from 'node:crypto'
import pool from './db.mjs'
import { hashPassword } from './auth.mjs'
import { ADMIN_ROLES } from './adminAuth.mjs'
import { adminPasswordSchema, emailSchema } from './validation.mjs'

async function main() {
  const [, , emailArg, passwordArg, roleArg] = process.argv
  if (!emailArg || !passwordArg) {
    console.error('Usage: node server/createAdmin.mjs <email> <password> [role]')
    process.exit(1)
  }
  const role = roleArg || 'super_admin'
  if (!ADMIN_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Must be one of: ${ADMIN_ROLES.join(', ')}`)
    process.exit(1)
  }

  const email = emailSchema.parse(emailArg)
  const passwordCheck = adminPasswordSchema.safeParse(passwordArg)
  if (!passwordCheck.success) {
    console.error(passwordCheck.error.issues[0]?.message || 'Invalid password')
    process.exit(1)
  }

  const { rows: existing } = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email])
  if (existing[0]) {
    console.error(`An admin account with email ${email} already exists.`)
    process.exit(1)
  }

  const id = crypto.randomUUID()
  await pool.query(
    'INSERT INTO admin_users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    [id, email, hashPassword(passwordCheck.data), role],
  )
  console.log(`Created ${role} admin account: ${email}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
