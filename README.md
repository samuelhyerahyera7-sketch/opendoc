# OpenDoc

A Zocdoc-style doctor search and booking platform for South Africa: patients
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

The schema is created and seeded automatically on first request with 36 demo doctors across all specialties (`server/seed.mjs`). Without `BLOB_READ_WRITE_TOKEN` set, uploaded patient files are written to `server/data/uploads` instead of Vercel Blob — fine for local dev, not durable in a real deployment.

## Deploying to Vercel

1. Import the GitHub repo into a Vercel project (framework preset: Vite — detected automatically).
2. In the project's **Storage** tab, add a **Postgres** database (or connect Neon/Supabase) — this sets `DATABASE_URL`/`POSTGRES_URL` for you. If it only sets `POSTGRES_URL`, add `DATABASE_URL` as an env var pointing to the same value (`server/db.mjs` reads `DATABASE_URL`).
3. In the same **Storage** tab, add a **Blob** store — this sets `BLOB_READ_WRITE_TOKEN` automatically.
4. Deploy. `vercel.json` routes everything except `/api/*` to `index.html` (SPA client-side routing) and lets Vercel's filesystem-based routing send `/api/*` to `api/[...path].js`, which wraps the same Express app used locally.

No manual migration step is needed — the API creates its schema and seeds demo data on first request against whatever `DATABASE_URL` it's given.

## Key flows

- **Patients:** search `/search?q=...` (filterable by specialty, medical aid/cash, distance, "accepting new patients"), or start from `/medical-aid` to browse by scheme (e.g. `/medical-aid/discovery-health-medical-scheme`). View a doctor's profile, pick an open time slot, and book — no account required. "Use my location" (or typing a known SA city/suburb) sorts and filters results by real distance.
- **Doctors:** register at `/provider/signup` to appear in search immediately, then manage things from `/provider/dashboard`:
  - **Appointments** — see everyone who has booked with you.
  - **Schedule** — publish/remove open time slots patients can book.
  - **Patient Files** — upload a file for a patient and transfer it to another doctor on the platform (searchable by name/email); the receiving doctor sees it under "Received from other doctors" and can download it.

## Scripts

- `npm run dev` — run frontend + backend together
- `npm run dev:client` / `npm run dev:server` — run either alone
- `npm run build` — typecheck + production frontend build
- `npm run lint` — Oxlint
