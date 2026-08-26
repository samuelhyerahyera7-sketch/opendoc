# OpenDoc

A doctor search and booking platform for South Africa: patients
search for doctors by specialty, name, location, or the medical aid they're
on (or as a cash-paying patient) and book real appointments; doctors create
a provider account, publish their availability, and securely transfer
patient files to other doctors on the platform.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS v4, client-side routed with React Router.
- **Backend:** Express API (`server/`) backed by Postgres. Deploys as a single Vercel project — the frontend as a static build, the API as one serverless function (`api/[...path].js`) handling everything under `/api/*`.
- **File storage:** patient files go to Vercel Blob in production (falls back to local disk in dev if no Blob token is configured) and are only ever served through an authenticated `/api/files/:id/download` route — never a raw, public URL.

## Running locally

1. Point `DATABASE_URL` at a Postgres database (copy `.env.example` to `.env` and edit it — any local or hosted Postgres works for dev).
2. Install and run:

```bash
npm install
npm run dev
```

This starts the Express API (port 5175) and the Vite dev server (port 5173, proxying `/api` to the backend) together via `concurrently`. Open http://localhost:5173.

Before the first run (and after pulling any change that adds a migration), apply the database schema:

```bash
npm run migrate
```

Then create your local admin account (see "Admin accounts" below) — there's no `ADMIN_TOKEN` shortcut any more.

Set `SEED_DEMO_DATA=true` in `.env` if you want ~36 fake demo doctors seeded automatically (only happens once, when the `doctors` table is empty). **Never set this in production** — see the warning in `.env.example`. Without `BLOB_READ_WRITE_TOKEN` set, uploaded patient files are written to `server/data/uploads` instead of Vercel Blob — fine for local dev, not durable in a real deployment.

## Database migrations

Schema changes are versioned SQL files in `server/migrations/`, applied in filename order by `server/migrate.mjs`. Applied migrations are tracked in a `schema_migrations` table, so re-running is always safe — already-applied files are skipped.

- Run migrations: `npm run migrate` (also runs automatically on server startup, in both dev and production, before the first request is served).
- Add a migration: create a new `NNNN_description.sql` file in `server/migrations/` with the next number. Write it idempotently (`IF NOT EXISTS` / guarded `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` for constraints) so it's safe to apply more than once if something goes wrong mid-run.
- There is no automatic down-migration — this is an additive-schema project (matching the healthcare-data reality that you rarely want to destroy a column, only stop using it). Write a new migration to reverse a change if one is ever truly needed.

## Admin accounts

There is no shared admin token any more — every admin action is tied to a real account with a role, and audited. Create the first one after running migrations:

```bash
npm run create-admin -- you@example.com "A very long unique password" super_admin
```

Roles: `super_admin` (everything, including permanent deletion), `verification_admin` (verify/reject/suspend/reactivate doctors), `support_admin` (read-only directory access plus support actions like opening a slot on a doctor's behalf). Log in at `/admin` — this sets a secure, HttpOnly, SameSite session cookie (`server/adminAuth.mjs`); there is no token stored in the browser for admin sessions. Every verification decision, suspension, reactivation, and deletion is written to `admin_audit_log` (queryable by a `super_admin` via `GET /api/admin/audit-log`).

## Deploying to Vercel

1. Import the GitHub repo into a Vercel project (framework preset: Vite — detected automatically).
2. In the project's **Storage** tab, add a **Postgres** database (or connect Neon/Supabase) — this sets `DATABASE_URL`/`POSTGRES_URL` for you. If it only sets `POSTGRES_URL`, add `DATABASE_URL` as an env var pointing to the same value (`server/db.mjs` reads `DATABASE_URL`).
3. In the same **Storage** tab, add a **Blob** store — this sets `BLOB_READ_WRITE_TOKEN` automatically.
4. Deploy. `vercel.json` routes everything except `/api/*` to `index.html` (SPA client-side routing) and `/api/*` to `api/index.js`, which wraps the same Express app used locally. Migrations run automatically on cold start before the first request is served — no manual migration step against the production database, though you can also run `npm run migrate` locally against the production `DATABASE_URL` if you want to apply a migration ahead of a deploy.
5. **Confirm `SEED_DEMO_DATA` is unset (or `false`) in the Vercel project's environment variables.** If it's ever `true` against an empty production database, it will populate it with fake doctors sharing a hardcoded demo password.
6. Create the production admin account by running `npm run create-admin` locally with `DATABASE_URL` pointed at production (or via `vercel env pull` to get the right value first).

## Key flows

- **Patients:** search `/search?q=...` (filterable by specialty, medical aid/cash, distance, "accepting new patients"), or start from `/medical-aid` to browse by scheme (e.g. `/medical-aid/discovery-health-medical-scheme`). View a doctor's profile, pick an open time slot, and book — a free patient account is required so bookings and updates stay in one place. "Use my location" (or typing a known SA city/suburb) sorts and filters results by real distance. After a visit, a per-appointment link (shown on the confirmation page, and emailed if configured) lets the patient leave a real review.
- **Doctors:** register at `/provider/signup` with an HPCSA registration number and set up your profile/schedule right away from `/provider/dashboard` — but **your profile is not visible in search or bookable until an admin verifies your HPCSA number**. A duplicate HPCSA number (already used by another account) is rejected at signup.
  - **Appointments** — see everyone who has booked with you.
  - **Schedule** — publish/remove open time slots patients can book.
  - **Patient Files** — upload a file for a patient and transfer it to another doctor on the platform (searchable by name/email); the receiving doctor sees it under "Received from other doctors" and can download it.
- **Admin:** `/admin` — see "Admin accounts" above. Verify/reject/suspend/reactivate doctors; permanent deletion is restricted to `super_admin`.

## Provider verification enforcement

A doctor's `verification_status` is one of `pending`, `verified`, `rejected`, or `suspended`. Only `verified` doctors are:

- returned by public search (`GET /api/doctors`),
- viewable at their public profile URL by a stranger (`GET /api/doctors/:id` — a non-verified doctor's profile 404s for anyone except the doctor themself or an admin, exactly like a nonexistent profile, so a rejected/suspended doctor's URL doesn't leak that it ever existed),
- listed in `sitemap.xml`,
- bookable at all (`POST /api/appointments` returns 403 for a non-verified doctor even with a valid slot ID).

Rejecting or suspending a doctor immediately revokes all of their active login sessions. A pending/rejected/suspended doctor can still log into their own dashboard to manage their profile and schedule ahead of approval — they're just told plainly (no "your listing is live" messaging) that patients can't see or book them yet.

## Email

Booking confirmations, new-booking alerts to doctors, provider email verification, and password reset all go through `server/email.mjs` (Resend). Without `RESEND_API_KEY` set, nothing is actually sent — the app logs what it would have sent and tells the frontend the truth (`emailSent: false`), so the UI never claims to have emailed someone when it didn't.

## Security

- **CORS** is restricted to `APP_URL` (plus any origins in `CORS_ORIGIN`) — the frontend and API are always same-origin in both dev and production, so this is a defense-in-depth measure, not something normal usage should ever hit.
- **Security headers** (CSP, HSTS, frame-ancestors, etc.) are set via Helmet on every API response. Note this only covers the `/api/*` responses — the static frontend HTML is served directly by Vercel, outside this Express app, so equivalent headers for the HTML document itself would need a `vercel.json` `headers` rule (not yet added).
- **Rate limiting** (`express-rate-limit`) is applied to login, registration, password reset, and booking endpoints.
- **Request validation** uses Zod (`server/validation.mjs`) on the highest-risk endpoints (admin login, doctor registration/login, booking) as the established pattern — not yet applied exhaustively to every endpoint.
- **Passwords** are hashed with `scrypt` (salted, timing-safe compare) — see `server/auth.mjs`. Doctor/patient passwords require letters and numbers, minimum 8 characters; admin passwords require upper+lowercase+numbers, minimum 12.
- **Sessions** are opaque random tokens stored server-side (`sessions` / `patient_sessions` / `admin_sessions` tables), so revocation is a real `DELETE`, not just a matter of a token expiring. Admin sessions are HttpOnly, Secure (in production), SameSite cookies. Doctor and patient sessions are still bearer tokens held in `localStorage` (see "What's still out of scope").

## Patient file permission model

Uploading a file makes a doctor its **owner**. Ownership grants view, download, and transfer rights. Transferring a file to another doctor grants that recipient **view and download only** — receiving a file never grants permission to forward it again. A further transfer (e.g. a referral chain) must come from the original owner, who confirms patient consent (a required checkbox, stored with an optional consent basis and timestamp on the transfer record) each time. Every upload, download, transfer, and denied access attempt is written to `file_access_log` for audit purposes. Uploads are restricted to an allowlist of healthcare-document types (PDF, JPEG, PNG, WebP, TIFF, DOC, DOCX), checked against the file's actual magic bytes — not just the browser-supplied MIME type, which can be wrong or spoofed. Malware scanning before a file becomes available is not yet implemented (see "What's still out of scope").

## POPIA foundation — not legal advice

The admin audit log, session revocation, and access-control changes in this stage are technical building blocks for handling personal and health information responsibly — they are **not** a legal compliance certification. Before relying on this for real patient data in South Africa, have a privacy professional or attorney review: data subject access/export requests, retention periods and deletion/anonymisation policy, the lawful basis recorded for each processing purpose, and the Terms/Privacy Policy wording. The current `/privacy` and `/terms` pages describe the system as it exists today rather than as a "working draft" — but that description has not been legally reviewed.

## What's still out of scope

This covers the core product and the most important trust/safety and security gaps, but a few things need either a paid third-party account this repo doesn't have, or are large enough to be their own follow-up:

- **Real HPCSA/medical-aid-eligibility verification.** The `/admin` review flow is a manual human check against the number a doctor types in — there's no live API integration with HPCSA or with medical aid schemes (Medikredit, HealthBridge, etc.), which requires a business agreement per provider.
- **Doctor/patient session storage.** Still a bearer token in `localStorage`, not an httpOnly cookie (admin sessions already moved to cookies this stage) — acceptable short-term, but a target for XSS. Migrating requires touching every authenticated API call across the frontend; deliberately deferred as a separate, larger follow-up rather than risking it alongside everything else in this stage.
- **Real appointment timestamps.** Appointments still store `day_label`/`time_label` strings rather than `starts_at`/`ends_at` timestamps; cancel/reschedule exist but the underlying data model rework (recurring provider schedules, timezone-aware fields, appointment-type support) is a separate stage.
- **Malware scanning** on uploaded patient files and dedicated error monitoring (Sentry or similar) are not wired up.
- **SEO** (structured data, prerendering) beyond the existing sitemap/robots.txt is not yet addressed.

## Scripts

- `npm run dev` — run frontend + backend together
- `npm run dev:client` / `npm run dev:server` — run either alone
- `npm run migrate` — apply database migrations
- `npm run create-admin -- <email> <password> [role]` — create an admin account
- `npm run build` — typecheck + production frontend build
- `npm run lint` — Oxlint
- `npm test` — runs the Node test suite (`server/*.test.mjs`) against `DATABASE_URL`
